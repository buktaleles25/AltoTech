import { describe, expect, it } from "vitest";
import { computeConfidenceScore, computeEdges, computeMarketAgreement } from "./edge";

describe("computeEdges", () => {
  it("is zero across the board when model matches the market exactly", () => {
    const probs = { home: 0.5, draw: 0.25, away: 0.25 };
    const edges = computeEdges(probs, probs);
    expect(edges.home).toBeCloseTo(0, 10);
    expect(edges.draw).toBeCloseTo(0, 10);
    expect(edges.away).toBeCloseTo(0, 10);
  });

  it("is positive when the model thinks an outcome is more likely than the market prices it", () => {
    const model = { home: 0.55, draw: 0.25, away: 0.2 };
    const implied = { home: 0.5, draw: 0.25, away: 0.25 };
    const edges = computeEdges(model, implied);
    expect(edges.home).toBeCloseTo(0.05, 10);
    expect(edges.away).toBeCloseTo(-0.05, 10);
  });

  it("treats a missing market draw as 0 rather than throwing", () => {
    const model = { home: 0.6, draw: 0.2, away: 0.2 };
    const implied = { home: 0.6, draw: null, away: 0.4 };
    expect(() => computeEdges(model, implied)).not.toThrow();
  });
});

describe("computeMarketAgreement", () => {
  it("is neutral (0.5) with fewer than 2 quotes — can't judge agreement from one price", () => {
    expect(computeMarketAgreement([0.5])).toBe(0.5);
    expect(computeMarketAgreement([])).toBe(0.5);
  });

  it("is 1 (full agreement) when every bookmaker quotes the exact same implied probability", () => {
    expect(computeMarketAgreement([0.5, 0.5, 0.5])).toBeCloseTo(1, 10);
  });

  it("decreases as bookmakers disagree more", () => {
    const tight = computeMarketAgreement([0.5, 0.51]);
    const wide = computeMarketAgreement([0.4, 0.6]);
    expect(tight).toBeGreaterThan(wide);
  });

  it("never goes below 0 for extreme disagreement", () => {
    expect(computeMarketAgreement([0.1, 0.9])).toBeGreaterThanOrEqual(0);
  });
});

describe("computeConfidenceScore", () => {
  it("is 100 when both inputs are perfect", () => {
    expect(computeConfidenceScore(1, 1)).toBe(100);
  });

  it("is 0 when both inputs are zero", () => {
    expect(computeConfidenceScore(0, 0)).toBe(0);
  });

  it("weights data completeness slightly more than market agreement", () => {
    const dataHeavy = computeConfidenceScore(1, 0);
    const marketHeavy = computeConfidenceScore(0, 1);
    expect(dataHeavy).toBeGreaterThan(marketHeavy);
  });
});
