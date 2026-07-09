import { describe, expect, it } from "vitest";
import {
  settleAh,
  settleOu,
  profitFromFraction,
  fractionToResult,
  coverProbability,
  expectedProfit,
} from "./bets";
import { buildScoreMatrix } from "./poisson";

describe("settleAh (Asian Handicap)", () => {
  it("half line: win by 1 covers home -0.5, busts away +0.5", () => {
    expect(settleAh(1, -0.5, "HOME")).toBe(1);
    expect(settleAh(1, -0.5, "AWAY")).toBe(-1);
  });

  it("whole line: exact 1-goal win on -1.0 is a push", () => {
    expect(settleAh(1, -1.0, "HOME")).toBe(0);
    expect(settleAh(2, -1.0, "HOME")).toBe(1);
  });

  it("level line (0.0): a draw is a push for both sides", () => {
    expect(settleAh(0, 0, "HOME")).toBe(0);
    expect(settleAh(0, 0, "AWAY")).toBe(0);
  });

  it("quarter line: a draw half-loses the favourite and half-wins the underdog", () => {
    expect(settleAh(0, -0.25, "HOME")).toBe(-0.5); // home favourite giving 0.25, drawn → half loss
    expect(settleAh(0, -0.25, "AWAY")).toBe(0.5); // away underdog receiving 0.25, drawn → half win
    expect(settleAh(0, 0.25, "HOME")).toBe(0.5); // home underdog receiving 0.25, drawn → half win
  });

  it("quarter line -0.75: a 1-goal win is a half win for the favourite", () => {
    expect(settleAh(1, -0.75, "HOME")).toBe(0.5);
    expect(settleAh(2, -0.75, "HOME")).toBe(1);
  });
});

describe("settleOu (Over/Under)", () => {
  it("half line 2.5: 3 goals is over, 2 goals is under", () => {
    expect(settleOu(3, 2.5, "OVER")).toBe(1);
    expect(settleOu(2, 2.5, "OVER")).toBe(-1);
    expect(settleOu(2, 2.5, "UNDER")).toBe(1);
  });

  it("whole line 3.0: exactly 3 goals is a push", () => {
    expect(settleOu(3, 3.0, "OVER")).toBe(0);
  });

  it("quarter line 2.75: exactly 3 goals half-wins the over", () => {
    expect(settleOu(3, 2.75, "OVER")).toBe(0.5);
    expect(settleOu(2, 2.25, "UNDER")).toBe(0.5);
  });
});

describe("profitFromFraction", () => {
  it("full win returns odds-1 profit", () => {
    expect(profitFromFraction(1, 1.95)).toBeCloseTo(0.95, 10);
  });
  it("half win returns half the profit", () => {
    expect(profitFromFraction(0.5, 1.9)).toBeCloseTo(0.45, 10);
  });
  it("push is break-even, half/full loss lose the staked fraction", () => {
    expect(profitFromFraction(0, 2)).toBe(0);
    expect(profitFromFraction(-0.5, 2)).toBe(-0.5);
    expect(profitFromFraction(-1, 2)).toBe(-1);
  });
});

describe("fractionToResult", () => {
  it("maps fractions to result labels", () => {
    expect(fractionToResult(1)).toBe("WON");
    expect(fractionToResult(0.5)).toBe("HALF_WON");
    expect(fractionToResult(0)).toBe("PUSH");
    expect(fractionToResult(-0.5)).toBe("HALF_LOST");
    expect(fractionToResult(-1)).toBe("LOST");
  });
});

describe("coverProbability / expectedProfit over a score matrix", () => {
  const sm = buildScoreMatrix(1.6, 1.1);

  it("H2H cover probability equals the outcome probability", () => {
    const pHome = coverProbability(sm, "H2H", "HOME", null);
    expect(pHome).toBeGreaterThan(0.4);
    expect(pHome).toBeLessThan(0.6);
  });

  it("Over and Under cover probabilities sum to ~1 on a half line (no push)", () => {
    const over = coverProbability(sm, "OU", "OVER", 2.5);
    const under = coverProbability(sm, "OU", "UNDER", 2.5);
    expect(over + under).toBeCloseTo(1, 8);
  });

  it("EV is zero at fair odds (1/coverProb) for a pure half line", () => {
    const p = coverProbability(sm, "AH", "HOME", -0.5);
    const fairOdds = 1 / p;
    expect(expectedProfit(sm, "AH", "HOME", -0.5, fairOdds)).toBeCloseTo(0, 8);
  });

  it("EV is positive when the offered odds beat the fair price", () => {
    const p = coverProbability(sm, "AH", "HOME", -0.5);
    const fairOdds = 1 / p;
    expect(expectedProfit(sm, "AH", "HOME", -0.5, fairOdds * 1.1)).toBeGreaterThan(0);
  });
});
