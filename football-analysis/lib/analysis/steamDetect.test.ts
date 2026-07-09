import { describe, expect, it } from "vitest";
import { detectSteamMove } from "./steamDetect";

describe("detectSteamMove", () => {
  it("returns null when nothing moved", () => {
    const probs = { home: 0.5, draw: 0.25, away: 0.25 };
    expect(detectSteamMove(probs, probs)).toBeNull();
  });

  it("returns null when the move is below the threshold", () => {
    const opening = { home: 0.5, draw: 0.25, away: 0.25 };
    const current = { home: 0.51, draw: 0.245, away: 0.245 }; // 1pt shift, below the 3pt threshold
    expect(detectSteamMove(opening, current)).toBeNull();
  });

  it("flags a home-ward steam move above the threshold", () => {
    const opening = { home: 0.5, draw: 0.25, away: 0.25 };
    const current = { home: 0.58, draw: 0.22, away: 0.2 };
    const steam = detectSteamMove(opening, current);
    expect(steam?.outcome).toBe("home");
    expect(steam?.delta).toBeCloseTo(0.08, 10);
  });

  it("flags the largest move when multiple outcomes shift", () => {
    const opening = { home: 0.4, draw: 0.3, away: 0.3 };
    const current = { home: 0.36, draw: 0.29, away: 0.35 }; // home -0.04, away +0.05 — away is largest
    const steam = detectSteamMove(opening, current);
    expect(steam?.outcome).toBe("away");
  });

  it("ignores draw when either snapshot lacks a draw price", () => {
    const opening = { home: 0.55, draw: null, away: 0.45 };
    const current = { home: 0.45, draw: null, away: 0.55 };
    const steam = detectSteamMove(opening, current);
    expect(steam?.outcome).not.toBe("draw");
  });
});
