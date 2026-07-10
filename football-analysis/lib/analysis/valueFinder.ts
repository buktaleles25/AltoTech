import { deVig, deVigTwoWay } from "./devig";
import { computeMarketAgreement } from "./edge";
import { coverProbability, expectedProfit, type Market, type Side } from "./bets";
import type { ScoreMatrix } from "./poisson";

export type H2HQuote = { bookmaker: string; home: number; draw: number | null; away: number };
export type SpreadQuote = { bookmaker: string; line: number; homeOdds: number; awayOdds: number };
export type TotalQuote = { bookmaker: string; line: number; overOdds: number; underOdds: number };

export type MarketQuotes = {
  h2h: H2HQuote[];
  spreads: SpreadQuote[];
  totals: TotalQuote[];
};

export type BetCandidate = {
  market: Market;
  side: Side;
  line: number | null;
  bestOdds: number;
  bookmaker: string;
  modelProb: number;
  fairProb: number;
  /** Expected profit per unit at bestOdds — the headline "edge". */
  ev: number;
  confidence: number;
  numBooks: number;
};

/** The sharp reference book whose de-vigged price we trust as "fair" when present. */
const SHARP_BOOK = "Pinnacle";

/** A single side's price offered by one or more books at one exact line. */
type PriceOption = { bookmaker: string; odds: number; fairProbFromThisBook: number };

function bestOf(options: PriceOption[]): { bestOdds: number; bookmaker: string } {
  return options.reduce(
    (best, o) => (o.odds > best.bestOdds ? { bestOdds: o.odds, bookmaker: o.bookmaker } : best),
    { bestOdds: 0, bookmaker: "" },
  );
}

/**
 * Fair probability = the sharp book's de-vigged price if it quotes this line, else the consensus
 * MEDIAN. Median, not mean: one soft book pricing a side generously both sets our bestOdds AND —
 * under a mean — drags the "fair" probability toward itself, manufacturing EV out of its own
 * mistake. The median ignores the outlier, so the edge is measured against the real consensus.
 */
function fairProbOf(options: PriceOption[]): number {
  const sharp = options.find((o) => o.bookmaker === SHARP_BOOK);
  if (sharp) return sharp.fairProbFromThisBook;
  const sorted = options.map((o) => o.fairProbFromThisBook).sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Keeps only the best-ranked candidate per direction, preserving the incoming (already ranked)
 * order. "Home to win" and "Home −0.5" are nearly the same bet — recommending both is one opinion
 * double-counted, not two bets. Since H2H and AH share HOME/AWAY sides, the side IS the direction
 * bucket (DRAW / OVER / UNDER each stand alone), so a fixture's picks come out as genuinely
 * different opinions, not one lean at three different lines.
 */
export function diversifyCandidates<T extends { side: Side }>(ranked: T[]): T[] {
  const seen = new Set<Side>();
  const out: T[] = [];
  for (const c of ranked) {
    if (seen.has(c.side)) continue;
    seen.add(c.side);
    out.push(c);
  }
  return out;
}

function confidenceOf(
  dataCompleteness: number,
  marketAgreement: number,
  numBooks: number,
  modelProb: number,
  fairProb: number,
): number {
  const liquidity = Math.min(numBooks / 4, 1);
  // Alignment: high when our estimate is close to the fair price (the price edge is real, not
  // model noise); low when we diverge a lot from the market (bigger but riskier claimed edge).
  const alignment = 1 - Math.min(Math.abs(modelProb - fairProb) / 0.15, 1);
  const combined = 0.35 * dataCompleteness + 0.25 * marketAgreement + 0.2 * liquidity + 0.2 * alignment;
  return Math.round(combined * 100);
}

/**
 * Enumerates every bettable outcome the market offers (1X2, each Asian Handicap line, each
 * Over/Under line), finds the best available price across books (line shopping), computes the
 * model's probability and the expected value at that best price, and returns them ranked by EV.
 *
 * The recommended PRICE is the best odds you can actually get; the "edge" (EV) is the model's
 * expected profit per unit at that price. Fair probability comes from the sharp book (Pinnacle)
 * when available, so most surfaced value is genuine best-price-vs-sharp-consensus value.
 */
export function findValueBets(sm: ScoreMatrix, quotes: MarketQuotes, dataCompleteness: number): BetCandidate[] {
  const candidates: BetCandidate[] = [];

  // --- 1X2 ---
  for (const side of ["HOME", "DRAW", "AWAY"] as const) {
    const options: PriceOption[] = [];
    for (const q of quotes.h2h) {
      if (side === "DRAW" && q.draw == null) continue;
      const odds = side === "HOME" ? q.home : side === "AWAY" ? q.away : (q.draw as number);
      if (!odds) continue;
      const p = deVig({ home: q.home, draw: q.draw, away: q.away });
      const fair = side === "HOME" ? p.home : side === "AWAY" ? p.away : (p.draw as number);
      options.push({ bookmaker: q.bookmaker, odds, fairProbFromThisBook: fair });
    }
    if (options.length === 0) continue;
    pushCandidate(candidates, sm, "H2H", side, null, options, dataCompleteness);
  }

  // --- Asian Handicap: one bet per (line, side) ---
  for (const line of uniqueLines(quotes.spreads.map((s) => s.line))) {
    const atLine = quotes.spreads.filter((s) => Math.abs(s.line - line) < 1e-9);
    for (const side of ["HOME", "AWAY"] as const) {
      const options: PriceOption[] = atLine.map((s) => {
        const dv = deVigTwoWay(s.homeOdds, s.awayOdds);
        return {
          bookmaker: s.bookmaker,
          odds: side === "HOME" ? s.homeOdds : s.awayOdds,
          fairProbFromThisBook: side === "HOME" ? dv.a : dv.b,
        };
      });
      pushCandidate(candidates, sm, "AH", side, line, options, dataCompleteness);
    }
  }

  // --- Over/Under: one bet per (line, side) ---
  for (const line of uniqueLines(quotes.totals.map((t) => t.line))) {
    const atLine = quotes.totals.filter((t) => Math.abs(t.line - line) < 1e-9);
    for (const side of ["OVER", "UNDER"] as const) {
      const options: PriceOption[] = atLine.map((t) => {
        const dv = deVigTwoWay(t.overOdds, t.underOdds);
        return {
          bookmaker: t.bookmaker,
          odds: side === "OVER" ? t.overOdds : t.underOdds,
          fairProbFromThisBook: side === "OVER" ? dv.a : dv.b,
        };
      });
      pushCandidate(candidates, sm, "OU", side, line, options, dataCompleteness);
    }
  }

  return candidates.sort((a, b) => b.ev - a.ev);
}

function pushCandidate(
  out: BetCandidate[],
  sm: ScoreMatrix,
  market: Market,
  side: Side,
  line: number | null,
  options: PriceOption[],
  dataCompleteness: number,
): void {
  if (options.length === 0) return;
  const { bestOdds, bookmaker } = bestOf(options);
  if (bestOdds <= 1) return;
  const fairProb = fairProbOf(options);
  const modelProb = coverProbability(sm, market, side, line);
  const ev = expectedProfit(sm, market, side, line, bestOdds);
  const marketAgreement = computeMarketAgreement(options.map((o) => o.fairProbFromThisBook));
  const confidence = confidenceOf(dataCompleteness, marketAgreement, options.length, modelProb, fairProb);
  out.push({ market, side, line, bestOdds, bookmaker, modelProb, fairProb, ev, confidence, numBooks: options.length });
}

function uniqueLines(lines: number[]): number[] {
  const seen = new Set<number>();
  const out: number[] = [];
  for (const l of lines) {
    const key = Math.round(l * 100) / 100;
    if (!seen.has(key)) {
      seen.add(key);
      out.push(key);
    }
  }
  return out;
}
