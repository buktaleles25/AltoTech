import { prisma } from "@/lib/db";
import { FixtureStatus, PickResult } from "@/lib/constants";
import { settleAh, settleOu, profitFromFraction, fractionToResult, type WinFraction } from "./bets";

/**
 * Grades every pending Pick whose fixture has finished (or was postponed/cancelled). Each Pick is
 * a standalone single bet, so it settles independently with its own flat-1-unit P/L — Asian lines
 * can half-win / half-lose / push, so the profit uses the exact settlement fraction × the odds
 * the pick was taken at.
 */
export async function settlePendingPicks(): Promise<{ graded: number }> {
  const pending = await prisma.pick.findMany({
    where: { result: PickResult.PENDING },
    include: { fixture: true },
  });

  let graded = 0;
  for (const pick of pending) {
    const f = pick.fixture;

    if (f.status === FixtureStatus.POSTPONED || f.status === FixtureStatus.CANCELLED) {
      await prisma.pick.update({
        where: { id: pick.id },
        data: { result: PickResult.VOID, profitLossUnits: 0, settledAt: new Date() },
      });
      graded += 1;
      continue;
    }

    if (f.status !== FixtureStatus.FINISHED || f.homeScore == null || f.awayScore == null) continue;

    const fraction = gradePick(pick.market, pick.side, pick.line, f.homeScore, f.awayScore);
    const profit = profitFromFraction(fraction, pick.odds);
    const closingOdds = await closingOddsFor(pick);
    await prisma.pick.update({
      where: { id: pick.id },
      data: {
        result: fractionToResult(fraction),
        profitLossUnits: profit,
        closingOdds,
        clv: closingOdds ? pick.odds / closingOdds - 1 : null,
        settledAt: new Date(),
      },
    });
    graded += 1;
  }

  return { graded };
}

type SettlingPick = { fixtureId: string; market: string; side: string; line: number | null; bookmaker: string };

/**
 * The market's last pre-kickoff price for the same bet (same market, same line, same side) —
 * preferring the pick's own bookmaker, falling back to the latest quote from any book. This is
 * the closing line: beating it consistently (positive CLV) is the strongest available evidence
 * that recommendations carry real signal rather than luck.
 */
async function closingOddsFor(pick: SettlingPick): Promise<number | null> {
  if (pick.market === "H2H") {
    const rows = await prisma.oddsSnapshot.findMany({
      where: { fixtureId: pick.fixtureId },
      orderBy: { capturedAt: "desc" },
    });
    const row = rows.find((r) => r.bookmaker === pick.bookmaker) ?? rows[0];
    if (!row) return null;
    return pick.side === "HOME" ? row.homeOdds : pick.side === "AWAY" ? row.awayOdds : row.drawOdds;
  }

  const market = pick.market === "AH" ? "SPREAD" : "TOTAL";
  if (pick.line == null) return null;
  const rows = await prisma.marketQuote.findMany({
    where: { fixtureId: pick.fixtureId, market, line: { gte: pick.line - 1e-6, lte: pick.line + 1e-6 } },
    orderBy: { capturedAt: "desc" },
  });
  const row = rows.find((r) => r.bookmaker === pick.bookmaker) ?? rows[0];
  if (!row) return null;
  // homeOrOverOdds carries HOME (spread) / OVER (total); the other column is AWAY / UNDER.
  return pick.side === "HOME" || pick.side === "OVER" ? row.homeOrOverOdds : row.awayOrUnderOdds;
}

/** Settlement fraction for one pick given the final score. */
export function gradePick(
  market: string,
  side: string,
  line: number | null,
  homeScore: number,
  awayScore: number,
): WinFraction {
  if (market === "AH") {
    return settleAh(homeScore - awayScore, line as number, side as "HOME" | "AWAY");
  }
  if (market === "OU") {
    return settleOu(homeScore + awayScore, line as number, side as "OVER" | "UNDER");
  }
  // H2H (1X2): no push.
  const margin = homeScore - awayScore;
  const won = (side === "HOME" && margin > 0) || (side === "AWAY" && margin < 0) || (side === "DRAW" && margin === 0);
  return won ? 1 : -1;
}
