import type { ThreeWayProbability } from "./devig";

export type Edges = { home: number; draw: number; away: number };

/** edge = model probability − de-vigged implied probability. Positive means the market is underpricing that outcome. */
export function computeEdges(model: ThreeWayProbability, implied: ThreeWayProbability): Edges {
  return {
    home: model.home - implied.home,
    draw: (model.draw ?? 0) - (implied.draw ?? 0),
    away: model.away - implied.away,
  };
}

/**
 * How closely bookmakers agree on the de-vigged home-win probability across a set of current
 * snapshots for the same fixture. Low spread ⇒ market consensus ⇒ higher confidence signal;
 * high spread ⇒ bookmakers disagree ⇒ treat the edge with more caution.
 */
export function computeMarketAgreement(impliedHomeProbs: number[]): number {
  if (impliedHomeProbs.length < 2) return 0.5; // single quote, can't judge agreement — neutral
  const mean = impliedHomeProbs.reduce((a, b) => a + b, 0) / impliedHomeProbs.length;
  const variance = impliedHomeProbs.reduce((a, b) => a + (b - mean) ** 2, 0) / impliedHomeProbs.length;
  const stdDev = Math.sqrt(variance);
  // A stddev of 0 → full agreement (1.0). A stddev of 0.05 (5 points of implied probability) or
  // more across bookmakers is treated as low agreement (0.0) — empirically a wide spread for a
  // liquid h2h market.
  return Math.max(0, 1 - stdDev / 0.05);
}

/** Combines model data-completeness and market agreement into a single 0-100 confidence score. */
export function computeConfidenceScore(dataCompleteness: number, marketAgreement: number): number {
  const combined = 0.55 * dataCompleteness + 0.45 * marketAgreement;
  return Math.round(combined * 100);
}
