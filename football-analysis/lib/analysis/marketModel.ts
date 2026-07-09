import { buildScoreMatrix, matchOutcomeProbs, forEachScore, type ScoreMatrix } from "./poisson";

export type MarketFitInput = {
  /** De-vigged 1X2 probabilities from the market (must sum to ~1). */
  h2h: { home: number; draw: number; away: number };
  /** A totals line + its de-vigged Over probability, if the market offers one. */
  totalsLine?: number | null;
  pOver?: number | null;
  /** Fallback expected total goals when no totals market is available (league-configurable). */
  priorTotalGoals: number;
  rho?: number;
};

const MIN_LAMBDA = 0.05;

function probOver(sm: ScoreMatrix, line: number): number {
  let over = 0;
  forEachScore(sm, (h, a, p) => {
    if (h + a > line) over += p;
  });
  return over;
}

function matrixFrom(total: number, supremacy: number, rho: number): ScoreMatrix {
  const lambdaHome = Math.max(MIN_LAMBDA, (total + supremacy) / 2);
  const lambdaAway = Math.max(MIN_LAMBDA, (total - supremacy) / 2);
  return buildScoreMatrix(lambdaHome, lambdaAway, rho);
}

/** Binary-search the supremacy (λh − λa) that reproduces the market's home-minus-away edge. */
function fitSupremacy(total: number, targetHomeMinusAway: number, rho: number): number {
  let lo = -4;
  let hi = 4;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    const o = matchOutcomeProbs(matrixFrom(total, mid, rho));
    if (o.home - o.away < targetHomeMinusAway) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/** Binary-search the total goals (λh + λa) that reproduces the market's Over probability. */
function fitTotal(supremacy: number, line: number, targetPOver: number, rho: number): number {
  let lo = 0.5;
  let hi = 6;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    // More total goals ⇒ higher P(over), so search is monotonic increasing in `mid`.
    if (probOver(matrixFrom(mid, supremacy, rho), line) < targetPOver) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/**
 * Reconstructs the expected-goal rates (and full Dixon-Coles score matrix) implied by the market.
 * Supremacy is fitted to the de-vigged 1X2 edge; total goals is fitted to the de-vigged Over
 * probability when a totals line exists, otherwise pinned to the league prior. When both are
 * present the two 1-D fits are alternated a few times since supremacy and total interact.
 */
export function fitScoreMatrix(input: MarketFitInput): ScoreMatrix {
  const rho = input.rho ?? -0.08;
  const targetHomeMinusAway = input.h2h.home - input.h2h.away;
  const hasTotals = input.totalsLine != null && input.pOver != null;

  let total = input.priorTotalGoals;
  let supremacy = fitSupremacy(total, targetHomeMinusAway, rho);

  if (hasTotals) {
    for (let iter = 0; iter < 6; iter++) {
      total = fitTotal(supremacy, input.totalsLine as number, input.pOver as number, rho);
      supremacy = fitSupremacy(total, targetHomeMinusAway, rho);
    }
  }

  return matrixFrom(total, supremacy, rho);
}

/**
 * Applies a small independent supremacy nudge (from our own form/strength signal) on top of the
 * market-fitted matrix — this is the ONLY place the model diverges from the market, and it's kept
 * deliberately small because our free-data signal is far thinner than the market's.
 */
export function nudgeSupremacy(sm: ScoreMatrix, supremacyDelta: number, rho = -0.08): ScoreMatrix {
  const total = sm.lambdaHome + sm.lambdaAway;
  const supremacy = sm.lambdaHome - sm.lambdaAway + supremacyDelta;
  return matrixFrom(total, supremacy, rho);
}
