import { describe, expect, it } from "vitest";
import { suggestedStakeUnits } from "./staking";
import { MAX_STAKE_UNITS, MIN_STAKE_UNITS } from "@/lib/constants";

describe("suggestedStakeUnits (quarter-Kelly on a 100u bankroll)", () => {
  it("computes the textbook case: p=0.525 at odds 2.00 → full Kelly 5% → 1.25u", () => {
    // b = 1, f* = (0.525·1 − 0.475)/1 = 0.05 → 0.05 × 0.25 × 100 = 1.25
    expect(suggestedStakeUnits(0.525, 2.0)).toBe(1.25);
  });

  it("returns 0 when the edge is non-positive (no bet)", () => {
    expect(suggestedStakeUnits(0.5, 2.0)).toBe(0); // exactly fair
    expect(suggestedStakeUnits(0.4, 2.0)).toBe(0); // negative edge
  });

  it("clamps huge edges to MAX_STAKE_UNITS", () => {
    expect(suggestedStakeUnits(0.9, 2.5)).toBe(MAX_STAKE_UNITS);
  });

  it("floors tiny positive edges at MIN_STAKE_UNITS", () => {
    // p=0.505 at 2.0 → f* = 0.01 → 0.25u exactly at the floor
    expect(suggestedStakeUnits(0.505, 2.0)).toBeGreaterThanOrEqual(MIN_STAKE_UNITS);
    expect(suggestedStakeUnits(0.505, 2.0)).toBeLessThanOrEqual(0.25);
  });

  it("rounds to quarter units", () => {
    const u = suggestedStakeUnits(0.56, 1.95);
    expect(u * 4).toBeCloseTo(Math.round(u * 4), 10);
  });

  it("guards degenerate inputs", () => {
    expect(suggestedStakeUnits(0.5, 1)).toBe(0);
    expect(suggestedStakeUnits(0, 2)).toBe(0);
    expect(suggestedStakeUnits(1, 2)).toBe(0);
  });
});
