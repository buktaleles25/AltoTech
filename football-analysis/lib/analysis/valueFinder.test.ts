import { describe, expect, it } from "vitest";
import { diversifyCandidates, findValueBets, type MarketQuotes } from "./valueFinder";
import { buildScoreMatrix, matchOutcomeProbs } from "./poisson";

const sm = buildScoreMatrix(1.6, 1.0);

describe("findValueBets", () => {
  it("takes the best price across books (line shopping) and names that book", () => {
    const quotes: MarketQuotes = {
      h2h: [
        { bookmaker: "Pinnacle", home: 2.0, draw: 3.5, away: 3.8 },
        { bookmaker: "SoftBook", home: 2.4, draw: 3.4, away: 3.6 },
      ],
      spreads: [],
      totals: [],
    };
    const bets = findValueBets(sm, quotes, 0.8);
    const home = bets.find((b) => b.market === "H2H" && b.side === "HOME");
    expect(home).toBeDefined();
    expect(home!.bestOdds).toBe(2.4);
    expect(home!.bookmaker).toBe("SoftBook");
  });

  it("EV = modelProb × bestOdds − 1 for a 1X2 bet", () => {
    const quotes: MarketQuotes = {
      h2h: [{ bookmaker: "SoftBook", home: 2.5, draw: 3.4, away: 3.6 }],
      spreads: [],
      totals: [],
    };
    const bets = findValueBets(sm, quotes, 0.8);
    const home = bets.find((b) => b.market === "H2H" && b.side === "HOME")!;
    const expectedEv = matchOutcomeProbs(sm).home * 2.5 - 1;
    expect(home.ev).toBeCloseTo(expectedEv, 8);
  });

  it("an inflated price yields positive EV; a stingy price yields negative EV", () => {
    const fairHome = 1 / matchOutcomeProbs(sm).home;
    const generous: MarketQuotes = {
      h2h: [{ bookmaker: "SoftBook", home: fairHome * 1.15, draw: 3.5, away: 3.8 }],
      spreads: [],
      totals: [],
    };
    const stingy: MarketQuotes = {
      h2h: [{ bookmaker: "SoftBook", home: fairHome * 0.85, draw: 3.5, away: 3.8 }],
      spreads: [],
      totals: [],
    };
    expect(findValueBets(sm, generous, 0.8).find((b) => b.side === "HOME")!.ev).toBeGreaterThan(0);
    expect(findValueBets(sm, stingy, 0.8).find((b) => b.side === "HOME")!.ev).toBeLessThan(0);
  });

  it("produces both sides of each Asian Handicap and Over/Under line", () => {
    const quotes: MarketQuotes = {
      h2h: [],
      spreads: [{ bookmaker: "Pinnacle", line: -0.5, homeOdds: 1.9, awayOdds: 2.0 }],
      totals: [{ bookmaker: "Pinnacle", line: 2.5, overOdds: 1.95, underOdds: 1.85 }],
    };
    const bets = findValueBets(sm, quotes, 0.8);
    expect(bets.some((b) => b.market === "AH" && b.side === "HOME" && b.line === -0.5)).toBe(true);
    expect(bets.some((b) => b.market === "AH" && b.side === "AWAY" && b.line === -0.5)).toBe(true);
    expect(bets.some((b) => b.market === "OU" && b.side === "OVER" && b.line === 2.5)).toBe(true);
    expect(bets.some((b) => b.market === "OU" && b.side === "UNDER" && b.line === 2.5)).toBe(true);
  });

  it("returns candidates sorted by EV descending", () => {
    const quotes: MarketQuotes = {
      h2h: [{ bookmaker: "SoftBook", home: 2.6, draw: 3.4, away: 3.2 }],
      spreads: [{ bookmaker: "Pinnacle", line: -0.5, homeOdds: 1.8, awayOdds: 2.1 }],
      totals: [],
    };
    const bets = findValueBets(sm, quotes, 0.8);
    for (let i = 1; i < bets.length; i++) {
      expect(bets[i - 1].ev).toBeGreaterThanOrEqual(bets[i].ev);
    }
  });
});

describe("fair probability uses the median of soft books (outlier resistance)", () => {
  it("one generous outlier book does not drag fair prob toward itself", () => {
    // Three books without Pinnacle: two agree, one is a wild outlier on the home price.
    // Under a mean the outlier would raise fairProb noticeably; the median ignores it.
    const quotes: MarketQuotes = {
      h2h: [
        { bookmaker: "A", home: 2.0, draw: 3.5, away: 3.8 },
        { bookmaker: "B", home: 2.02, draw: 3.5, away: 3.8 },
        { bookmaker: "OutlierBook", home: 2.8, draw: 3.5, away: 3.8 },
      ],
      spreads: [],
      totals: [],
    };
    const home = findValueBets(sm, quotes, 0.8).find((b) => b.market === "H2H" && b.side === "HOME")!;
    // Median of the three de-vigged home probs = book B's — far from the outlier's low prob.
    const probs = quotes.h2h
      .map((q) => {
        const total = 1 / q.home + 1 / (q.draw as number) + 1 / q.away;
        return 1 / q.home / total;
      })
      .sort((a, b) => a - b);
    expect(home.fairProb).toBeCloseTo(probs[1], 10);
  });
});

describe("diversifyCandidates", () => {
  it("keeps only the best-ranked bet per direction, preserving rank order", () => {
    const ranked = [
      { market: "AH", side: "HOME", tag: "best-home" },
      { market: "H2H", side: "HOME", tag: "dup-home" },
      { market: "OU", side: "OVER", tag: "best-over" },
      { market: "AH", side: "HOME", tag: "dup-home-2" },
      { market: "AH", side: "AWAY", tag: "best-away" },
      { market: "OU", side: "OVER", tag: "dup-over" },
    ] as const;
    const out = diversifyCandidates([...ranked]);
    expect(out.map((c) => c.tag)).toEqual(["best-home", "best-over", "best-away"]);
  });
});
