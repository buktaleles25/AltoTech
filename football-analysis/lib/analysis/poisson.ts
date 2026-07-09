/**
 * Bivariate score model for football. A match is modelled as two Poisson goal counts (home, away)
 * with a Dixon-Coles low-score correction, which corrects independent Poisson's known
 * under-/over-statement of 0-0, 1-0, 0-1 and 1-1 scorelines. From the resulting score matrix we
 * can price EVERY market (1X2, Asian Handicap, Over/Under) consistently off one distribution.
 *
 * Reference: Dixon & Coles (1997), "Modelling Association Football Scores and Inefficiencies in
 * the Football Betting Market".
 */

export type ScoreMatrix = {
  /** matrix[h][a] = P(home scores h, away scores a). Rows/cols indexed 0..maxGoals. */
  matrix: number[][];
  maxGoals: number;
  lambdaHome: number;
  lambdaAway: number;
};

const DEFAULT_MAX_GOALS = 12;

function poissonPmf(k: number, lambda: number): number {
  if (lambda <= 0) return k === 0 ? 1 : 0;
  return Math.exp(-lambda + k * Math.log(lambda) - logFactorial(k));
}

const LOG_FACT_CACHE: number[] = [0, 0];
function logFactorial(n: number): number {
  if (n < LOG_FACT_CACHE.length) return LOG_FACT_CACHE[n];
  let value = LOG_FACT_CACHE[LOG_FACT_CACHE.length - 1];
  for (let i = LOG_FACT_CACHE.length; i <= n; i++) {
    value += Math.log(i);
    LOG_FACT_CACHE[i] = value;
  }
  return LOG_FACT_CACHE[n];
}

/** Dixon-Coles tau correction for the four low-score cells; rho typically in [-0.15, 0]. */
function tau(h: number, a: number, lambdaHome: number, lambdaAway: number, rho: number): number {
  if (h === 0 && a === 0) return 1 - lambdaHome * lambdaAway * rho;
  if (h === 0 && a === 1) return 1 + lambdaHome * rho;
  if (h === 1 && a === 0) return 1 + lambdaAway * rho;
  if (h === 1 && a === 1) return 1 - rho;
  return 1;
}

/**
 * Builds a normalized Dixon-Coles score matrix from the two expected-goal rates.
 * rho=0 reduces to plain independent Poisson.
 */
export function buildScoreMatrix(
  lambdaHome: number,
  lambdaAway: number,
  rho = -0.08,
  maxGoals = DEFAULT_MAX_GOALS,
): ScoreMatrix {
  const matrix: number[][] = [];
  let total = 0;
  for (let h = 0; h <= maxGoals; h++) {
    matrix[h] = [];
    const ph = poissonPmf(h, lambdaHome);
    for (let a = 0; a <= maxGoals; a++) {
      const pa = poissonPmf(a, lambdaAway);
      const cell = ph * pa * tau(h, a, lambdaHome, lambdaAway, rho);
      matrix[h][a] = cell;
      total += cell;
    }
  }
  // Renormalize (tau correction + truncation at maxGoals both perturb the total off 1).
  for (let h = 0; h <= maxGoals; h++) {
    for (let a = 0; a <= maxGoals; a++) {
      matrix[h][a] /= total;
    }
  }
  return { matrix, maxGoals, lambdaHome, lambdaAway };
}

/** 1X2 outcome probabilities from the score matrix. */
export function matchOutcomeProbs(sm: ScoreMatrix): { home: number; draw: number; away: number } {
  let home = 0;
  let draw = 0;
  let away = 0;
  for (let h = 0; h <= sm.maxGoals; h++) {
    for (let a = 0; a <= sm.maxGoals; a++) {
      const p = sm.matrix[h][a];
      if (h > a) home += p;
      else if (h === a) draw += p;
      else away += p;
    }
  }
  return { home, draw, away };
}

/** Iterate every (homeGoals, awayGoals, probability) cell — used to price handicap/total bets. */
export function forEachScore(sm: ScoreMatrix, fn: (h: number, a: number, p: number) => void): void {
  for (let h = 0; h <= sm.maxGoals; h++) {
    for (let a = 0; a <= sm.maxGoals; a++) {
      fn(h, a, sm.matrix[h][a]);
    }
  }
}

/** Expected total goals implied by the matrix (used when reconciling against the market totals line). */
export function expectedTotalGoals(sm: ScoreMatrix): number {
  let total = 0;
  forEachScore(sm, (h, a, p) => {
    total += (h + a) * p;
  });
  return total;
}
