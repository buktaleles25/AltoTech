export type ThreeWayOdds = { home: number; draw?: number | null; away: number };
export type ThreeWayProbability = { home: number; draw: number | null; away: number };

/**
 * Converts decimal bookmaker odds into de-vigged (overround-removed) implied probabilities.
 *
 * Raw implied probability per outcome is `1 / odds`. Summed across all outcomes in a market
 * this exceeds 1 (the bookmaker's margin, aka "vig" or "overround"). Dividing each raw
 * probability by that sum ("multiplicative de-vig") rescales them back to a true distribution
 * that sums to 1, which is what we compare our model probability against.
 */
export function deVig(odds: ThreeWayOdds): ThreeWayProbability {
  const rawHome = 1 / odds.home;
  const rawAway = 1 / odds.away;
  const rawDraw = odds.draw ? 1 / odds.draw : 0;

  const overround = rawHome + rawAway + rawDraw;

  return {
    home: rawHome / overround,
    away: rawAway / overround,
    draw: odds.draw ? rawDraw / overround : null,
  };
}

/** The bookmaker's margin as a fraction (e.g. 0.05 = 5% overround). */
export function overroundOf(odds: ThreeWayOdds): number {
  const rawHome = 1 / odds.home;
  const rawAway = 1 / odds.away;
  const rawDraw = odds.draw ? 1 / odds.draw : 0;
  return rawHome + rawAway + rawDraw - 1;
}
