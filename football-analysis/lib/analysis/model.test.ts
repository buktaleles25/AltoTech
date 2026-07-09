import { describe, expect, it } from "vitest";
import { computeModelProbabilities, type ModelInput } from "./model";

const evenForm = { last5Ppg: 1.8, homePpg: 1.8, awayPpg: 1.8 };
const evenMarket = { home: 0.4, draw: 0.28, away: 0.32 }; // a realistic de-vigged home-favourite market

function baseInput(overrides: Partial<ModelInput> = {}): ModelInput {
  return {
    home: evenForm,
    away: evenForm,
    homeMissing: { count: 0 },
    awayMissing: { count: 0 },
    h2h: null,
    homeLineupConfirmed: true,
    awayLineupConfirmed: true,
    marketImplied: evenMarket,
    ...overrides,
  };
}

describe("computeModelProbabilities", () => {
  it("always returns probabilities that sum to 1", () => {
    const out = computeModelProbabilities(baseInput());
    expect(out.homeProb + out.drawProb + out.awayProb).toBeCloseTo(1, 8);
  });

  it("stays market-anchored: with identical teams, output should be close to the market price, not a wild independent guess", () => {
    const out = computeModelProbabilities(baseInput());
    // Evenly matched teams -> independent model is ~50/50-ish: the blended result should sit
    // between the market's 40% and a neutral ~50%, materially closer to the market (65% weight).
    expect(out.homeProb).toBeGreaterThan(evenMarket.home - 0.1);
    expect(out.homeProb).toBeLessThan(evenMarket.home + 0.1);
  });

  it("reduces the home win probability as the home side loses more key players, all else equal", () => {
    const healthy = computeModelProbabilities(baseInput({ homeMissing: { count: 0 } }));
    const injured = computeModelProbabilities(baseInput({ homeMissing: { count: 3 } }));
    expect(injured.homeProb).toBeLessThan(healthy.homeProb);
  });

  it("increases the away win probability when the away side has a dominant h2h record", () => {
    const noH2h = computeModelProbabilities(baseInput({ h2h: null }));
    const awayDominant = computeModelProbabilities(
      baseInput({ h2h: { teamAWins: 0, teamBWins: 5, draws: 0, sampleSize: 5 } }),
    );
    expect(awayDominant.awayProb).toBeGreaterThan(noH2h.awayProb);
  });

  it("reports full data completeness only when lineups are confirmed and h2h sample is ample", () => {
    const complete = computeModelProbabilities(
      baseInput({ homeLineupConfirmed: true, awayLineupConfirmed: true, h2h: { teamAWins: 2, teamBWins: 2, draws: 1, sampleSize: 5 } }),
    );
    const incomplete = computeModelProbabilities(baseInput({ homeLineupConfirmed: false, awayLineupConfirmed: false, h2h: null }));
    expect(complete.dataCompleteness).toBeGreaterThan(incomplete.dataCompleteness);
    expect(complete.dataCompleteness).toBeLessThanOrEqual(1);
    expect(incomplete.dataCompleteness).toBeGreaterThanOrEqual(0);
  });

  it("never produces a negative probability even for extreme inputs", () => {
    const out = computeModelProbabilities(
      baseInput({ homeMissing: { count: 10 }, marketImplied: { home: 0.01, draw: 0.01, away: 0.98 } }),
    );
    expect(out.homeProb).toBeGreaterThanOrEqual(0);
    expect(out.drawProb).toBeGreaterThanOrEqual(0);
    expect(out.awayProb).toBeGreaterThanOrEqual(0);
  });
});
