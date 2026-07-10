import { describe, expect, it } from "vitest";
import { bangkokEndOfDay, bangkokStartOfDay } from "./time";

describe("bangkok day boundaries (UTC+7, no DST)", () => {
  it("end of Bangkok day = 16:59:59.999 UTC of the same UTC date when before 17:00 UTC", () => {
    // 2026-07-10 15:11 UTC = 22:11 Bangkok → Bangkok day ends 2026-07-10 16:59:59.999 UTC (= 23:59:59 Thai)
    const now = new Date("2026-07-10T15:11:00Z");
    expect(bangkokEndOfDay(now).toISOString()).toBe("2026-07-10T16:59:59.999Z");
  });

  it("after 17:00 UTC it is already the NEXT Bangkok day", () => {
    // 2026-07-10 20:00 UTC = 03:00 Bangkok on July 11 → day ends July 11 16:59:59.999 UTC
    const now = new Date("2026-07-10T20:00:00Z");
    expect(bangkokEndOfDay(now).toISOString()).toBe("2026-07-11T16:59:59.999Z");
  });

  it("plusDays extends whole Bangkok days", () => {
    const now = new Date("2026-07-10T15:11:00Z");
    expect(bangkokEndOfDay(now, 2).toISOString()).toBe("2026-07-12T16:59:59.999Z");
  });

  it("start of Bangkok day = 17:00 UTC of the previous UTC date", () => {
    const now = new Date("2026-07-10T15:11:00Z");
    expect(bangkokStartOfDay(now).toISOString()).toBe("2026-07-09T17:00:00.000Z");
  });

  it("a 21:00 UTC kickoff tonight is NOT within the Bangkok 'today' window", () => {
    const now = new Date("2026-07-10T15:11:00Z");
    const kickoff = new Date("2026-07-10T21:00:00Z"); // 04:00 Bangkok tomorrow
    expect(kickoff.getTime()).toBeGreaterThan(bangkokEndOfDay(now).getTime());
  });
});
