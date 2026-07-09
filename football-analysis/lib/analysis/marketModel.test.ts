import { describe, expect, it } from "vitest";
import { fitScoreMatrix, nudgeSupremacy } from "./marketModel";
import { buildScoreMatrix, matchOutcomeProbs, forEachScore } from "./poisson";

function probOver(sm: ReturnType<typeof buildScoreMatrix>, line: number): number {
  let over = 0;
  forEachScore(sm, (h, a, p) => {
    if (h + a > line) over += p;
  });
  return over;
}

describe("fitScoreMatrix", () => {
  it("round-trips: recovers the λ that generated a known market", () => {
    // Generate a 'market' from known rates, then check the fit reconstructs them.
    const truth = buildScoreMatrix(1.7, 1.0);
    const o = matchOutcomeProbs(truth);
    const pOver = probOver(truth, 2.5);

    const fitted = fitScoreMatrix({ h2h: o, totalsLine: 2.5, pOver, priorTotalGoals: 2.6 });

    expect(fitted.lambdaHome).toBeCloseTo(1.7, 1);
    expect(fitted.lambdaAway).toBeCloseTo(1.0, 1);
  });

  it("reproduces the market's 1X2 edge (home minus away)", () => {
    const h2h = { home: 0.5, draw: 0.28, away: 0.22 };
    const fitted = fitScoreMatrix({ h2h, priorTotalGoals: 2.6 });
    const o = matchOutcomeProbs(fitted);
    expect(o.home - o.away).toBeCloseTo(h2h.home - h2h.away, 2);
  });

  it("without totals, pins total goals near the league prior", () => {
    const fitted = fitScoreMatrix({ h2h: { home: 0.4, draw: 0.3, away: 0.3 }, priorTotalGoals: 2.4 });
    expect(fitted.lambdaHome + fitted.lambdaAway).toBeCloseTo(2.4, 5);
  });
});

describe("nudgeSupremacy", () => {
  it("a positive nudge raises the home win probability, keeping total goals fixed", () => {
    const base = fitScoreMatrix({ h2h: { home: 0.4, draw: 0.3, away: 0.3 }, priorTotalGoals: 2.6 });
    const nudged = nudgeSupremacy(base, 0.3);
    expect(matchOutcomeProbs(nudged).home).toBeGreaterThan(matchOutcomeProbs(base).home);
    expect(nudged.lambdaHome + nudged.lambdaAway).toBeCloseTo(base.lambdaHome + base.lambdaAway, 6);
  });
});
