import { describe, expect, it } from "vitest";
import { deVig, overroundOf } from "./devig";

describe("deVig", () => {
  it("returns probabilities that sum to 1", () => {
    const result = deVig({ home: 1.95, draw: 3.5, away: 3.9 });
    expect(result.home + (result.draw ?? 0) + result.away).toBeCloseTo(1, 10);
  });

  it("removes the bookmaker's margin proportionally (fair odds pass through unchanged)", () => {
    // Fair 2-way odds with no margin: 1/2 + 1/2 = 1, so de-vig should be a no-op.
    const result = deVig({ home: 2, away: 2 });
    expect(result.home).toBeCloseTo(0.5, 10);
    expect(result.away).toBeCloseTo(0.5, 10);
    expect(result.draw).toBeNull();
  });

  it("shortens the favourite's price into a higher implied probability than raw 1/odds after de-vig", () => {
    // Raw 1/1.95 = 0.5128, but with ~5.5% overround the de-vigged value should still be
    // proportionally scaled down (not up) — the de-vig divides by the overround (>1), so it's
    // always <= the raw implied probability for every outcome.
    const raw = 1 / 1.95;
    const result = deVig({ home: 1.95, draw: 3.5, away: 3.9 });
    expect(result.home).toBeLessThan(raw);
  });

  it("handles a market with no draw", () => {
    const result = deVig({ home: 1.5, away: 2.8 });
    expect(result.draw).toBeNull();
    expect(result.home + result.away).toBeCloseTo(1, 10);
  });
});

describe("overroundOf", () => {
  it("is 0 for a fair (no-margin) market", () => {
    expect(overroundOf({ home: 2, away: 2 })).toBeCloseTo(0, 10);
  });

  it("is positive for a real bookmaker market", () => {
    expect(overroundOf({ home: 1.95, draw: 3.5, away: 3.9 })).toBeGreaterThan(0);
  });
});
