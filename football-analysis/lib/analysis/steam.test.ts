import { describe, expect, it } from "vitest";
import { computeSteamDelta, steamConfidenceAdjustment, steamNote } from "./steam";
import { STEAM_CONFIDENCE_WEIGHT, STEAM_MOVE_THRESHOLD } from "@/lib/constants";

describe("computeSteamDelta", () => {
  it("is current minus opening", () => {
    const d = computeSteamDelta({ home: 0.5, away: 0.3 }, { home: 0.55, away: 0.26 });
    expect(d).toEqual({ home: expect.closeTo(0.05, 10), away: expect.closeTo(-0.04, 10) });
  });

  it("is null without an opening line", () => {
    expect(computeSteamDelta(null, { home: 0.5, away: 0.3 })).toBeNull();
  });
});

describe("steamConfidenceAdjustment", () => {
  const towardHome = { home: STEAM_MOVE_THRESHOLD, away: -STEAM_MOVE_THRESHOLD };

  it("a full steam move toward the pick adds the full weight", () => {
    expect(steamConfidenceAdjustment("AH", "HOME", towardHome)).toBe(STEAM_CONFIDENCE_WEIGHT);
    expect(steamConfidenceAdjustment("H2H", "HOME", towardHome)).toBe(STEAM_CONFIDENCE_WEIGHT);
  });

  it("the same move against the pick subtracts it", () => {
    expect(steamConfidenceAdjustment("AH", "AWAY", towardHome)).toBe(-STEAM_CONFIDENCE_WEIGHT);
  });

  it("saturates: a double-size move doesn't exceed the weight", () => {
    const huge = { home: 4 * STEAM_MOVE_THRESHOLD, away: -4 * STEAM_MOVE_THRESHOLD };
    expect(steamConfidenceAdjustment("H2H", "HOME", huge)).toBe(STEAM_CONFIDENCE_WEIGHT);
  });

  it("half-threshold move gives a proportional partial adjustment", () => {
    const half = { home: STEAM_MOVE_THRESHOLD / 2, away: -STEAM_MOVE_THRESHOLD / 2 };
    expect(steamConfidenceAdjustment("H2H", "HOME", half)).toBe(Math.round(STEAM_CONFIDENCE_WEIGHT / 2));
  });

  it("totals and the draw are unadjusted; so is a missing delta", () => {
    expect(steamConfidenceAdjustment("OU", "OVER", towardHome)).toBe(0);
    expect(steamConfidenceAdjustment("OU", "UNDER", towardHome)).toBe(0);
    expect(steamConfidenceAdjustment("H2H", "DRAW", towardHome)).toBe(0);
    expect(steamConfidenceAdjustment("AH", "HOME", null)).toBe(0);
  });
});

describe("steamNote", () => {
  const towardHome = { home: STEAM_MOVE_THRESHOLD, away: -STEAM_MOVE_THRESHOLD };

  it("labels a move toward the pick positively and against it as a warning", () => {
    expect(steamNote("AH", "HOME", towardHome)).toContain("ไหลเข้าทาง");
    expect(steamNote("AH", "AWAY", towardHome)).toContain("ไหลสวนทาง");
  });

  it("is silent for insignificant moves or missing data", () => {
    const tiny = { home: STEAM_MOVE_THRESHOLD / 3, away: -STEAM_MOVE_THRESHOLD / 3 };
    expect(steamNote("AH", "HOME", tiny)).toBeNull();
    expect(steamNote("AH", "HOME", null)).toBeNull();
  });
});
