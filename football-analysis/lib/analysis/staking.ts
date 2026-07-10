import { KELLY_FRACTION, MAX_STAKE_UNITS, MIN_STAKE_UNITS } from "@/lib/constants";

/**
 * Suggested stake in units via fractional Kelly.
 *
 * Full Kelly stakes f* = (p·b − q) / b of bankroll (b = odds − 1, q = 1 − p), which maximises
 * long-run growth but is famously too aggressive for noisy edges — so we bet KELLY_FRACTION of it.
 * Units are anchored to a 100-unit bankroll (1u = the flat stake used everywhere else), rounded to
 * quarter units, clamped to [MIN_STAKE_UNITS, MAX_STAKE_UNITS]. Returns 0 when the edge is
 * non-positive (no bet).
 */
export function suggestedStakeUnits(modelProb: number, odds: number): number {
  if (odds <= 1 || modelProb <= 0 || modelProb >= 1) return 0;
  const b = odds - 1;
  const fullKelly = (modelProb * b - (1 - modelProb)) / b;
  if (fullKelly <= 0) return 0;
  const units = fullKelly * KELLY_FRACTION * 100;
  const rounded = Math.round(units * 4) / 4;
  return Math.min(MAX_STAKE_UNITS, Math.max(MIN_STAKE_UNITS, rounded));
}
