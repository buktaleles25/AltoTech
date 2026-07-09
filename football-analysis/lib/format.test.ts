import { describe, expect, it } from "vitest";
import { betLabel, formatLineMagnitude } from "./format";

describe("formatLineMagnitude", () => {
  it("formats whole and half lines directly", () => {
    expect(formatLineMagnitude(0)).toBe("0");
    expect(formatLineMagnitude(0.5)).toBe("0.5");
    expect(formatLineMagnitude(1)).toBe("1");
    expect(formatLineMagnitude(1.5)).toBe("1.5");
  });

  it("splits quarter lines into their two component lines", () => {
    expect(formatLineMagnitude(0.25)).toBe("0/0.5");
    expect(formatLineMagnitude(0.75)).toBe("0.5/1");
    expect(formatLineMagnitude(2.25)).toBe("2/2.5");
  });
});

describe("betLabel (Thai)", () => {
  const H = "ฝรั่งเศส";
  const A = "โมร็อกโก";

  it("Asian Handicap favourite uses ต่อ", () => {
    expect(betLabel("AH", "HOME", -0.5, H, A)).toBe("ฝรั่งเศส ต่อ 0.5");
  });

  it("Asian Handicap underdog uses รอง (away side of a home-favourite line)", () => {
    expect(betLabel("AH", "AWAY", -0.5, H, A)).toBe("โมร็อกโก รอง 0.5");
  });

  it("home underdog line (+0.5) is รอง", () => {
    expect(betLabel("AH", "HOME", 0.5, H, A)).toBe("ฝรั่งเศส รอง 0.5");
  });

  it("quarter line splits", () => {
    expect(betLabel("AH", "HOME", -0.25, H, A)).toBe("ฝรั่งเศส ต่อ 0/0.5");
  });

  it("level line (0.0) is เสมอ", () => {
    expect(betLabel("AH", "HOME", 0, H, A)).toBe("ฝรั่งเศส เสมอ");
  });

  it("Over/Under", () => {
    expect(betLabel("OU", "OVER", 2.5, H, A)).toBe("สูง 2.5");
    expect(betLabel("OU", "UNDER", 2.75, H, A)).toBe("ต่ำ 2.5/3");
  });

  it("1X2", () => {
    expect(betLabel("H2H", "HOME", null, H, A)).toBe("ฝรั่งเศส ชนะ");
    expect(betLabel("H2H", "DRAW", null, H, A)).toBe("เสมอ");
    expect(betLabel("H2H", "AWAY", null, H, A)).toBe("โมร็อกโก ชนะ");
  });
});
