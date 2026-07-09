import { prisma } from "@/lib/db";
import { ODDS_API_MARKETS, TRACKED_LEAGUES } from "@/lib/constants";
import { deVig } from "@/lib/analysis/devig";
import { hoursFromNow, readMockJson, requireEnv, USE_MOCK_DATA } from "./util";

type MockOdds = {
  fixtureId: string;
  bookmaker: string;
  homeOdds: number;
  drawOdds: number;
  awayOdds: number;
  isOpeningLine: boolean;
  capturedAtOffsetHours: number;
};

type MockMarket = {
  fixtureId: string;
  bookmaker: string;
  market: "SPREAD" | "TOTAL";
  line: number;
  homeOrOverOdds: number;
  awayOrUnderOdds: number;
  capturedAtOffsetHours: number;
};

/**
 * Pulls real bookmaker odds for three markets and stores timestamped snapshots:
 *  - h2h (1X2) → OddsSnapshot
 *  - spreads (Asian Handicap) + totals (Over/Under) → MarketQuote
 * Real mode: The Odds API `/v4/sports/{sport}/odds?markets=h2h,spreads,totals&regions=eu`. One
 * request returns every upcoming match in a league across all three markets; cost = markets ×
 * regions = 3 credits per league. Ingest active leagues once/day to stay inside the 500/month tier.
 */
export async function ingestOdds(): Promise<{ snapshots: number; quotes: number }> {
  if (USE_MOCK_DATA) return ingestOddsFromMock();
  return ingestOddsFromOddsApi();
}

async function ingestOddsFromMock(): Promise<{ snapshots: number; quotes: number }> {
  const odds = await readMockJson<MockOdds[]>("odds.json");
  const markets = await readMockJson<MockMarket[]>("markets.json").catch(() => [] as MockMarket[]);
  let snapshots = 0;
  let quotes = 0;

  for (const s of odds) {
    if (!(await prisma.fixture.findUnique({ where: { id: s.fixtureId } }))) continue;
    const implied = deVig({ home: s.homeOdds, draw: s.drawOdds, away: s.awayOdds });
    await prisma.oddsSnapshot.create({
      data: {
        fixtureId: s.fixtureId,
        bookmaker: s.bookmaker,
        homeOdds: s.homeOdds,
        drawOdds: s.drawOdds,
        awayOdds: s.awayOdds,
        impliedHomeProb: implied.home,
        impliedDrawProb: implied.draw,
        impliedAwayProb: implied.away,
        isOpeningLine: s.isOpeningLine,
        capturedAt: hoursFromNow(s.capturedAtOffsetHours),
      },
    });
    snapshots += 1;
  }

  for (const m of markets) {
    if (!(await prisma.fixture.findUnique({ where: { id: m.fixtureId } }))) continue;
    await prisma.marketQuote.create({
      data: {
        fixtureId: m.fixtureId,
        bookmaker: m.bookmaker,
        market: m.market,
        line: m.line,
        homeOrOverOdds: m.homeOrOverOdds,
        awayOrUnderOdds: m.awayOrUnderOdds,
        capturedAt: hoursFromNow(m.capturedAtOffsetHours),
      },
    });
    quotes += 1;
  }

  return { snapshots, quotes };
}

const INGEST_HORIZON_DAYS = 10;

type OddsApiEvent = {
  id: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers: Array<{
    title: string;
    markets: Array<{ key: string; outcomes: Array<{ name: string; price: number; point?: number }> }>;
  }>;
};

async function ingestOddsFromOddsApi(): Promise<{ snapshots: number; quotes: number }> {
  const apiKey = requireEnv("ODDS_API_KEY");
  const horizon = new Date(Date.now() + INGEST_HORIZON_DAYS * 24 * 60 * 60 * 1000);
  const markets = ODDS_API_MARKETS.join(",");
  let snapshots = 0;
  let quotes = 0;

  for (const league of TRACKED_LEAGUES) {
    // Quota gate: the `/events` endpoint is FREE (returns commence_time without spending credits),
    // so we peek first and only pay the 3-credit `/odds` call for leagues that actually have a
    // match inside the horizon. Off-season leagues (no near-term fixture) cost 0 — this is what
    // lets us track more leagues safely without burning through the 500/month tier.
    if (!(await hasUpcomingEvent(league.oddsApiKey, apiKey, horizon))) continue;

    const url = `https://api.the-odds-api.com/v4/sports/${league.oddsApiKey}/odds/?apiKey=${apiKey}&regions=eu&markets=${markets}&oddsFormat=decimal`;
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`The Odds API request failed for ${league.name}: ${res.status}`);
      continue;
    }
    const events = (await res.json()) as OddsApiEvent[];

    for (const event of events) {
      if (new Date(event.commence_time) > horizon) continue;

      const [homeTeam, awayTeam] = await Promise.all([
        upsertTeamByName(event.home_team, league.name, league.country),
        upsertTeamByName(event.away_team, league.name, league.country),
      ]);
      const fixture = await prisma.fixture.upsert({
        where: { oddsApiId: event.id },
        update: {},
        create: {
          oddsApiId: event.id,
          homeTeamId: homeTeam.id,
          awayTeamId: awayTeam.id,
          league: league.name,
          kickoffAt: new Date(event.commence_time),
        },
      });

      // First-ever quote of each market kind for a fixture is the "opening line".
      let firstH2H = (await prisma.oddsSnapshot.count({ where: { fixtureId: fixture.id } })) === 0;
      let firstQuote = (await prisma.marketQuote.count({ where: { fixtureId: fixture.id } })) === 0;

      for (const bk of event.bookmakers) {
        for (const market of bk.markets) {
          if (market.key === "h2h") {
            const home = market.outcomes.find((o) => o.name === event.home_team)?.price;
            const away = market.outcomes.find((o) => o.name === event.away_team)?.price;
            const draw = market.outcomes.find((o) => o.name === "Draw")?.price;
            if (!home || !away) continue;
            const implied = deVig({ home, draw, away });
            await prisma.oddsSnapshot.create({
              data: {
                fixtureId: fixture.id,
                bookmaker: bk.title,
                homeOdds: home,
                drawOdds: draw ?? null,
                awayOdds: away,
                impliedHomeProb: implied.home,
                impliedDrawProb: implied.draw ?? null,
                impliedAwayProb: implied.away,
                isOpeningLine: firstH2H,
              },
            });
            firstH2H = false;
            snapshots += 1;
          } else if (market.key === "spreads") {
            const homeOutcome = market.outcomes.find((o) => o.name === event.home_team);
            const awayOutcome = market.outcomes.find((o) => o.name === event.away_team);
            if (!homeOutcome || !awayOutcome || homeOutcome.point == null) continue;
            await prisma.marketQuote.create({
              data: {
                fixtureId: fixture.id,
                bookmaker: bk.title,
                market: "SPREAD",
                line: homeOutcome.point, // home handicap
                homeOrOverOdds: homeOutcome.price,
                awayOrUnderOdds: awayOutcome.price,
                isOpeningLine: firstQuote,
              },
            });
            firstQuote = false;
            quotes += 1;
          } else if (market.key === "totals") {
            const over = market.outcomes.find((o) => o.name === "Over");
            const under = market.outcomes.find((o) => o.name === "Under");
            if (!over || !under || over.point == null) continue;
            await prisma.marketQuote.create({
              data: {
                fixtureId: fixture.id,
                bookmaker: bk.title,
                market: "TOTAL",
                line: over.point,
                homeOrOverOdds: over.price,
                awayOrUnderOdds: under.price,
                isOpeningLine: firstQuote,
              },
            });
            firstQuote = false;
            quotes += 1;
          }
        }
      }
    }
  }

  return { snapshots, quotes };
}

type OddsApiEventStub = { commence_time: string };

/**
 * Free pre-check: does this league have a match within the horizon? The `/events` endpoint does
 * NOT count against the odds quota (x-requests-last: 0), so we can safely poll every tracked
 * league — including off-season ones — and only spend credits on `/odds` where there's actually
 * something to price. On any error we return true (fail open) so a flaky `/events` call never
 * silently starves a live league of odds.
 */
async function hasUpcomingEvent(sportKey: string, apiKey: string, horizon: Date): Promise<boolean> {
  const url = `https://api.the-odds-api.com/v4/sports/${sportKey}/events/?apiKey=${apiKey}`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`The Odds API /events check failed for ${sportKey}: ${res.status}`);
      return true;
    }
    const events = (await res.json()) as OddsApiEventStub[];
    const now = Date.now();
    return events.some((e) => {
      const t = new Date(e.commence_time).getTime();
      return t >= now && t <= horizon.getTime();
    });
  } catch (err) {
    console.error(`The Odds API /events check errored for ${sportKey}:`, err);
    return true;
  }
}

/** Find-or-create a Team by name — The Odds API identifies teams by name only, no stable id. */
async function upsertTeamByName(name: string, league: string, country: string) {
  const existing = await prisma.team.findFirst({ where: { name, league } });
  if (existing) return existing;
  return prisma.team.create({ data: { name, shortName: name, league, country } });
}
