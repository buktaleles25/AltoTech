import { prisma } from "@/lib/db";
import { betLabel } from "@/lib/format";
import {
  DEFAULT_TOTAL_GOALS,
  DIXON_COLES_RHO,
  MAX_PICK_ODDS,
  MAX_PICKS_PER_FIXTURE,
  MIN_PICK_CONFIDENCE,
  MIN_PICK_ODDS,
  MODEL_SUPREMACY_WEIGHT,
  TRACKED_LEAGUES,
  TWO_WAY_MARKET_PREFERENCE,
  VALUE_EDGE_THRESHOLD,
} from "@/lib/constants";
import { deVig, deVigTwoWay } from "./devig";
import { fitScoreMatrix, nudgeSupremacy } from "./marketModel";
import { matchOutcomeProbs } from "./poisson";
import { bangkokStartOfDay } from "@/lib/time";
import { computeSteamDelta, steamConfidenceAdjustment, steamNote } from "./steam";
import { diversifyCandidates, findValueBets, type MarketQuotes, type H2HQuote, type SpreadQuote, type TotalQuote } from "./valueFinder";

const SHARP_BOOK = "Pinnacle";

export type FixtureAnalysis = { fixtureId: string; picks: number };

/**
 * Full value-betting pipeline for one upcoming fixture:
 *  1. Fit a Dixon-Coles score matrix to the de-vigged market (h2h supremacy + totals).
 *  2. Nudge it with our own current-season strength + lineup signal (small weight).
 *  3. Price every 1X2 / Asian Handicap / Over-Under bet the market offers, find the best price and
 *     the model's expected value, and persist the top qualifying bets as Picks.
 * Returns null if there isn't enough odds data yet.
 */
export async function analyzeFixture(fixtureId: string): Promise<FixtureAnalysis | null> {
  const fixture = await prisma.fixture.findUnique({
    where: { id: fixtureId },
    include: {
      homeTeam: true,
      awayTeam: true,
      lineups: true,
      oddsSnapshots: { orderBy: { capturedAt: "desc" } },
      marketQuotes: { orderBy: { capturedAt: "desc" } },
    },
  });
  if (!fixture) return null;

  const quotes = assembleQuotes(fixture.oddsSnapshots, fixture.marketQuotes);
  if (quotes.h2h.length === 0) return null; // need a moneyline to anchor the model

  const fairH2H = consensusH2H(quotes.h2h);
  const league = TRACKED_LEAGUES.find((l) => l.name === fixture.league);
  const priorTotalGoals = league?.defaultTotalGoals ?? DEFAULT_TOTAL_GOALS;
  const totalsSignal = consensusTotals(quotes.totals);

  const baseMatrix = fitScoreMatrix({
    h2h: fairH2H,
    totalsLine: totalsSignal?.line ?? null,
    pOver: totalsSignal?.pOver ?? null,
    priorTotalGoals,
    rho: DIXON_COLES_RHO,
  });

  // Independent supremacy nudge (the only divergence from the market).
  const strengthDelta = await strengthSupremacyDelta(fixture.homeTeam, fixture.awayTeam, fixture.league, baseMatrix);
  const lineupDelta = lineupSupremacyDelta(fixture.lineups, fixture.homeTeamId, fixture.awayTeamId);
  const supremacyDelta = strengthDelta.delta + lineupDelta;
  const model = nudgeSupremacy(baseMatrix, supremacyDelta, DIXON_COLES_RHO);

  const hasStrength = strengthDelta.available;
  const hasTotals = totalsSignal != null;
  const lineupsConfirmed = fixture.lineups.some((l) => l.isConfirmed);
  const dataCompleteness = 0.4 + 0.3 * (hasStrength ? 1 : 0) + 0.2 * (hasTotals ? 1 : 0) + 0.1 * (lineupsConfirmed ? 1 : 0);

  const rankScore = (c: { ev: number; confidence: number; market: string }) =>
    c.ev * c.confidence * (c.market === "H2H" ? 1 : TWO_WAY_MARKET_PREFERENCE);

  // Line movement since open: sharp money moving toward a side validates it, against it warns.
  const steamDelta = computeSteamDelta(openingH2HConsensus(fixture.oddsSnapshots), fairH2H);

  // Directions already recommended for this fixture (still pending) — kept, never re-litigated.
  const existingPicks = await prisma.pick.findMany({
    where: { fixtureId, result: "PENDING" },
    select: { side: true },
  });
  const existingDirections = new Set(existingPicks.map((p) => p.side));

  const candidates = findValueBets(model, quotes, dataCompleteness).map((c) => ({
    ...c,
    confidence: clampConfidence(c.confidence + steamConfidenceAdjustment(c.market, c.side, steamDelta)),
  }));
  const qualifying = diversifyCandidates(
    candidates
      .filter(
        (c) =>
          c.ev >= VALUE_EDGE_THRESHOLD &&
          c.confidence >= MIN_PICK_CONFIDENCE &&
          c.bestOdds >= MIN_PICK_ODDS &&
          c.bestOdds <= MAX_PICK_ODDS,
      )
      // Rank by EV × confidence, with a variance preference for the two-way handicap/total markets,
      // so tight reliable lines win over high-variance longshots with a merely-big raw EV.
      .sort((a, b) => rankScore(b) - rankScore(a)),
    // One pick per direction (best line only) — "Home win" + "Home −0.25" + "Home −0.5" is one
    // opinion three times, not three recommendations.
  )
    // A published recommendation is a commitment: it never silently disappears when a later run
    // finds the value has evaporated (users plan around it, and history/CLV must grade the price
    // we actually recommended). Re-analysis may only ADD picks in directions not yet taken,
    // up to the per-fixture cap.
    .filter((c) => !existingDirections.has(c.side))
    .slice(0, Math.max(0, MAX_PICKS_PER_FIXTURE - existingDirections.size));

  const kickoffDay = bangkokStartOfDay(new Date(fixture.kickoffAt));

  const outcome = matchOutcomeProbs(model);
  const h2hBest = bestH2HOdds(quotes.h2h);

  await prisma.$transaction([
    prisma.modelPrediction.create({
      data: {
        fixtureId,
        modelHomeProb: outcome.home,
        modelDrawProb: outcome.draw,
        modelAwayProb: outcome.away,
        edgeHome: h2hBest.home ? outcome.home * h2hBest.home - 1 : 0,
        edgeDraw: h2hBest.draw ? outcome.draw * h2hBest.draw - 1 : 0,
        edgeAway: h2hBest.away ? outcome.away * h2hBest.away - 1 : 0,
        expectedGoalsHome: model.lambdaHome,
        expectedGoalsAway: model.lambdaAway,
        confidenceScore: qualifying[0]?.confidence ?? Math.round(dataCompleteness * 100),
        reasoning: strengthDelta.note,
      },
    }),
    ...qualifying.map((c) =>
      prisma.pick.create({
        data: {
          fixtureId,
          date: kickoffDay,
          market: c.market,
          side: c.side,
          line: c.line,
          odds: c.bestOdds,
          bookmaker: c.bookmaker,
          modelProb: c.modelProb,
          fairProb: c.fairProb,
          edge: c.ev,
          confidence: c.confidence,
          reasoning: pickReasoning(
            c,
            fixture.homeTeam.name,
            fixture.awayTeam.name,
            [strengthDelta.note, steamNote(c.market, c.side, steamDelta)].filter(Boolean).join(" · "),
          ),
        },
      }),
    ),
  ]);

  return { fixtureId, picks: existingDirections.size + qualifying.length };
}

// --- quote assembly ------------------------------------------------------------------------------

type OddsSnapshotRow = {
  bookmaker: string;
  homeOdds: number;
  drawOdds: number | null;
  awayOdds: number;
  isOpeningLine: boolean;
};
type MarketQuoteRow = {
  bookmaker: string;
  market: string;
  line: number;
  homeOrOverOdds: number;
  awayOrUnderOdds: number;
  isOpeningLine: boolean;
};

function assembleQuotes(oddsSnapshots: OddsSnapshotRow[], marketQuotes: MarketQuoteRow[]): MarketQuotes {
  const h2h: H2HQuote[] = [];
  const seenH2H = new Set<string>();
  for (const s of oddsSnapshots) {
    if (s.isOpeningLine) continue;
    if (seenH2H.has(s.bookmaker)) continue; // rows are desc by capturedAt → first is latest
    seenH2H.add(s.bookmaker);
    h2h.push({ bookmaker: s.bookmaker, home: s.homeOdds, draw: s.drawOdds, away: s.awayOdds });
  }

  const spreads: SpreadQuote[] = [];
  const totals: TotalQuote[] = [];
  const seenSpread = new Set<string>();
  const seenTotal = new Set<string>();
  for (const q of marketQuotes) {
    if (q.isOpeningLine) continue;
    const key = `${q.bookmaker}:${q.line}`;
    if (q.market === "SPREAD") {
      if (seenSpread.has(key)) continue;
      seenSpread.add(key);
      spreads.push({ bookmaker: q.bookmaker, line: q.line, homeOdds: q.homeOrOverOdds, awayOdds: q.awayOrUnderOdds });
    } else if (q.market === "TOTAL") {
      if (seenTotal.has(key)) continue;
      seenTotal.add(key);
      totals.push({ bookmaker: q.bookmaker, line: q.line, overOdds: q.homeOrOverOdds, underOdds: q.awayOrUnderOdds });
    }
  }

  return { h2h, spreads, totals };
}

function clampConfidence(c: number): number {
  return Math.max(0, Math.min(100, c));
}

/**
 * De-vigged consensus of the OPENING h2h snapshots (average across books), for measuring how far
 * the market has moved since open. Null when no opening rows exist yet.
 */
function openingH2HConsensus(
  snapshots: Array<OddsSnapshotRow>,
): { home: number; away: number } | null {
  const opening = snapshots.filter((s) => s.isOpeningLine);
  if (opening.length === 0) return null;
  let home = 0;
  let away = 0;
  let n = 0;
  for (const s of opening) {
    const p = deVig({ home: s.homeOdds, draw: s.drawOdds, away: s.awayOdds });
    home += p.home;
    away += p.away;
    n += 1;
  }
  return { home: home / n, away: away / n };
}

function consensusH2H(h2h: H2HQuote[]): { home: number; draw: number; away: number } {
  const sharp = h2h.find((q) => q.bookmaker === SHARP_BOOK);
  if (sharp) {
    const p = deVig({ home: sharp.home, draw: sharp.draw, away: sharp.away });
    return { home: p.home, draw: p.draw ?? 0, away: p.away };
  }
  let home = 0;
  let draw = 0;
  let away = 0;
  for (const q of h2h) {
    const p = deVig({ home: q.home, draw: q.draw, away: q.away });
    home += p.home;
    draw += p.draw ?? 0;
    away += p.away;
  }
  const sum = home + draw + away;
  return { home: home / sum, draw: draw / sum, away: away / sum };
}

/** Pick the totals line offered by the most books and de-vig its consensus Over probability. */
function consensusTotals(totals: TotalQuote[]): { line: number; pOver: number } | null {
  if (totals.length === 0) return null;
  const byLine = new Map<number, TotalQuote[]>();
  for (const t of totals) {
    const list = byLine.get(t.line) ?? [];
    list.push(t);
    byLine.set(t.line, list);
  }
  let bestLine = 0;
  let bestCount = 0;
  for (const [line, list] of byLine) {
    if (list.length > bestCount) {
      bestCount = list.length;
      bestLine = line;
    }
  }
  const atLine = byLine.get(bestLine) as TotalQuote[];
  const sharp = atLine.find((t) => t.bookmaker === SHARP_BOOK) ?? atLine[0];
  const dv = deVigTwoWay(sharp.overOdds, sharp.underOdds);
  return { line: bestLine, pOver: dv.a };
}

function bestH2HOdds(h2h: H2HQuote[]): { home: number; draw: number; away: number } {
  return {
    home: Math.max(0, ...h2h.map((q) => q.home)),
    draw: Math.max(0, ...h2h.map((q) => q.draw ?? 0)),
    away: Math.max(0, ...h2h.map((q) => q.away)),
  };
}

// --- independent signals -------------------------------------------------------------------------

type TeamStrength = { gfPerGame: number | null; gaPerGame: number | null };

async function strengthSupremacyDelta(
  home: TeamStrength,
  away: TeamStrength,
  league: string,
  baseMatrix: { lambdaHome: number; lambdaAway: number },
): Promise<{ delta: number; available: boolean; note: string }> {
  if (home.gfPerGame == null || away.gfPerGame == null || home.gaPerGame == null || away.gaPerGame == null) {
    return { delta: 0, available: false, note: "อิงราคาตลาดล้วน (ไม่มีสถิติฤดูกาลปัจจุบัน)" };
  }
  const leagueAvg = await leagueAvgGoalsForPerGame(league);
  if (leagueAvg <= 0) return { delta: 0, available: false, note: "อิงราคาตลาดล้วน" };

  // Simple attack×defense expected-goals model relative to league average.
  const lh = leagueAvg * (home.gfPerGame / leagueAvg) * (away.gaPerGame / leagueAvg);
  const la = leagueAvg * (away.gfPerGame / leagueAvg) * (home.gaPerGame / leagueAvg);
  const indepSup = lh - la;
  const marketSup = baseMatrix.lambdaHome - baseMatrix.lambdaAway;
  const delta = MODEL_SUPREMACY_WEIGHT * (indepSup - marketSup);

  const note =
    Math.abs(delta) < 0.05
      ? "โมเดลเห็นด้วยกับราคาตลาด"
      : delta > 0
        ? "ฟอร์มบอลได้-เสียฤดูกาลนี้หนุนเจ้าบ้านมากกว่าที่ตลาดให้"
        : "ฟอร์มบอลได้-เสียฤดูกาลนี้หนุนทีมเยือนมากกว่าที่ตลาดให้";
  return { delta, available: true, note };
}

async function leagueAvgGoalsForPerGame(league: string): Promise<number> {
  const teams = await prisma.team.findMany({
    where: { league, gfPerGame: { not: null } },
    select: { gfPerGame: true },
  });
  if (teams.length === 0) return 0;
  return teams.reduce((sum, t) => sum + (t.gfPerGame ?? 0), 0) / teams.length;
}

function lineupSupremacyDelta(
  lineups: { teamId: string; missingPlayersJson: string | null }[],
  homeTeamId: string,
  awayTeamId: string,
): number {
  const PER_PLAYER = 0.08;
  const homeMissing = countMissing(lineups.find((l) => l.teamId === homeTeamId)?.missingPlayersJson);
  const awayMissing = countMissing(lineups.find((l) => l.teamId === awayTeamId)?.missingPlayersJson);
  // Missing home players lower home supremacy; missing away players raise it.
  return -homeMissing * PER_PLAYER + awayMissing * PER_PLAYER;
}

function countMissing(json: string | null | undefined): number {
  if (!json) return 0;
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed.length : 0;
  } catch {
    return 0;
  }
}

// --- reasoning text ------------------------------------------------------------------------------

function pickReasoning(
  c: { market: string; side: string; line: number | null; bestOdds: number; bookmaker: string; modelProb: number; fairProb: number; ev: number },
  homeName: string,
  awayName: string,
  strengthNote: string,
): string {
  const label = betLabel(c.market, c.side, c.line, homeName, awayName);
  const fairOdds = c.fairProb > 0 ? (1 / c.fairProb).toFixed(2) : "-";
  const parts = [
    `${label}`,
    `ราคายุติธรรม ~${fairOdds} · ราคาดีสุด ${c.bookmaker} ${c.bestOdds.toFixed(2)}`,
    `โมเดลให้โอกาส ${(c.modelProb * 100).toFixed(0)}% · EV ${c.ev >= 0 ? "+" : ""}${(c.ev * 100).toFixed(1)}%`,
  ];
  if (strengthNote) parts.push(strengthNote);
  return parts.join(" · ");
}
