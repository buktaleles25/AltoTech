import { STEAM_MOVE_THRESHOLD } from "@/lib/constants";
import type { ThreeWayProbability } from "./devig";

export type SteamMove = {
  outcome: "home" | "draw" | "away";
  delta: number; // positive = shortened (market moved toward this outcome)
} | null;

/**
 * Compares the opening line's de-vigged probability against the current line's to detect a
 * "steam move" — a shift large enough to suggest sharp/informed money has moved the market.
 * Returns the single largest qualifying move, or null if nothing crossed the threshold.
 */
export function detectSteamMove(opening: ThreeWayProbability, current: ThreeWayProbability): SteamMove {
  const deltas: Array<{ outcome: "home" | "draw" | "away"; delta: number }> = [
    { outcome: "home", delta: current.home - opening.home },
    { outcome: "away", delta: current.away - opening.away },
  ];
  if (opening.draw != null && current.draw != null) {
    deltas.push({ outcome: "draw", delta: current.draw - opening.draw });
  }

  const largest = deltas.reduce((a, b) => (Math.abs(b.delta) > Math.abs(a.delta) ? b : a));
  if (Math.abs(largest.delta) < STEAM_MOVE_THRESHOLD) return null;
  return largest;
}
