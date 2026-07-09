import { describe, expect, it } from "vitest";
import { buildScoreMatrix, matchOutcomeProbs, expectedTotalGoals } from "./poisson";

describe("buildScoreMatrix", () => {
  it("produces a normalized distribution (sums to 1)", () => {
    const sm = buildScoreMatrix(1.6, 1.1);
    let total = 0;
    for (const row of sm.matrix) for (const p of row) total += p;
    expect(total).toBeCloseTo(1, 8);
  });

  it("independent Poisson (rho=0) has expected total goals ≈ λh + λa", () => {
    const sm = buildScoreMatrix(1.7, 1.2, 0);
    expect(expectedTotalGoals(sm)).toBeCloseTo(1.7 + 1.2, 3);
  });

  it("symmetric when both teams have equal expected goals", () => {
    const o = matchOutcomeProbs(buildScoreMatrix(1.4, 1.4));
    expect(o.home).toBeCloseTo(o.away, 8);
  });

  it("higher home expected goals shifts probability toward the home win", () => {
    const weak = matchOutcomeProbs(buildScoreMatrix(1.2, 1.2));
    const strong = matchOutcomeProbs(buildScoreMatrix(2.0, 1.2));
    expect(strong.home).toBeGreaterThan(weak.home);
    expect(strong.away).toBeLessThan(weak.away);
  });
});

describe("matchOutcomeProbs", () => {
  it("sums to 1", () => {
    const o = matchOutcomeProbs(buildScoreMatrix(1.5, 1.3));
    expect(o.home + o.draw + o.away).toBeCloseTo(1, 8);
  });

  it("Dixon-Coles correction raises the draw probability vs plain Poisson for low-scoring games", () => {
    const plain = matchOutcomeProbs(buildScoreMatrix(1.0, 1.0, 0));
    const corrected = matchOutcomeProbs(buildScoreMatrix(1.0, 1.0, -0.12));
    expect(corrected.draw).toBeGreaterThan(plain.draw);
  });
});
