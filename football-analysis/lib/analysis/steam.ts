import { STEAM_CONFIDENCE_WEIGHT, STEAM_MOVE_THRESHOLD } from "@/lib/constants";
import type { Market, Side } from "./bets";

/** Opening → current shift in de-vigged h2h probabilities (current − opening, sums ≈ 0). */
export type SteamDelta = { home: number; away: number };

/**
 * Opening-vs-current market movement for a fixture's h2h prices. Uses the de-vigged consensus of
 * the opening snapshots against the current consensus. Null when there's no opening line to
 * compare against (first ingest of a fixture).
 */
export function computeSteamDelta(
  opening: { home: number; away: number } | null,
  current: { home: number; away: number },
): SteamDelta | null {
  if (!opening) return null;
  return { home: current.home - opening.home, away: current.away - opening.away };
}

/**
 * Confidence adjustment (in points, ±STEAM_CONFIDENCE_WEIGHT) for one candidate bet given how the
 * market has moved since open. A move toward the side we like means sharp money agrees with the
 * model; a move against it is a warning sign. Saturates at STEAM_MOVE_THRESHOLD (a full "steam
 * move"). Sides the h2h movement says nothing about (totals) get 0.
 */
export function steamConfidenceAdjustment(market: Market, side: Side, delta: SteamDelta | null): number {
  if (!delta) return 0;
  // Directional exposure: HOME-side bets benefit when home strength rises, AWAY-side the reverse.
  // The draw and totals have no clean h2h direction — leave them unadjusted.
  let exposure = 0;
  if (side === "HOME") exposure = delta.home - delta.away;
  else if (side === "AWAY") exposure = delta.away - delta.home;
  else return 0;

  const saturated = Math.max(-1, Math.min(1, exposure / (2 * STEAM_MOVE_THRESHOLD)));
  return Math.round(saturated * STEAM_CONFIDENCE_WEIGHT);
}

/** Thai note describing a significant steam move relative to this pick, or null if not significant. */
export function steamNote(market: Market, side: Side, delta: SteamDelta | null): string | null {
  if (!delta) return null;
  const adj = steamConfidenceAdjustment(market, side, delta);
  const significant = Math.abs(side === "HOME" ? delta.home : side === "AWAY" ? delta.away : 0) >= STEAM_MOVE_THRESHOLD;
  if (!significant || adj === 0) return null;
  return adj > 0 ? "ราคาน้ำไหลเข้าทางบิลนี้ตั้งแต่เปิดไลน์" : "ระวัง: ราคาน้ำไหลสวนทางบิลนี้";
}
