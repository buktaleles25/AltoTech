import { prisma } from "@/lib/db";
import { TRACKED_LEAGUES } from "@/lib/constants";
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

/**
 * Pulls real bookmaker odds and stores a timestamped snapshot per bookmaker per fixture.
 * Real mode: The Odds API `/v4/sports/{sport}/odds` — ONE request per tracked league returns
 * odds for every upcoming match in that league, so 5 tracked leagues x 3 calls/day (morning,
 * afternoon, T-60min) is ~15 requests/day, comfortably inside the 500/month free quota.
 */
export async function ingestOdds(): Promise<{ snapshots: number }> {
  if (USE_MOCK_DATA) return ingestOddsFromMock();
  return ingestOddsFromOddsApi();
}

async function ingestOddsFromMock(): Promise<{ snapshots: number }> {
  const odds = await readMockJson<MockOdds[]>("odds.json");
  let count = 0;

  for (const snapshot of odds) {
    const fixtureExists = await prisma.fixture.findUnique({ where: { id: snapshot.fixtureId } });
    if (!fixtureExists) continue;

    const implied = deVig({ home: snapshot.homeOdds, draw: snapshot.drawOdds, away: snapshot.awayOdds });

    await prisma.oddsSnapshot.create({
      data: {
        fixtureId: snapshot.fixtureId,
        bookmaker: snapshot.bookmaker,
        homeOdds: snapshot.homeOdds,
        drawOdds: snapshot.drawOdds,
        awayOdds: snapshot.awayOdds,
        impliedHomeProb: implied.home,
        impliedDrawProb: implied.draw,
        impliedAwayProb: implied.away,
        isOpeningLine: snapshot.isOpeningLine,
        capturedAt: hoursFromNow(snapshot.capturedAtOffsetHours),
      },
    });
    count += 1;
  }

  return { snapshots: count };
}

const INGEST_HORIZON_DAYS = 10;

async function ingestOddsFromOddsApi(): Promise<{ snapshots: number }> {
  const apiKey = requireEnv("ODDS_API_KEY");
  const horizon = new Date(Date.now() + INGEST_HORIZON_DAYS * 24 * 60 * 60 * 1000);
  let count = 0;

  for (const league of TRACKED_LEAGUES) {
    const url = `https://api.the-odds-api.com/v4/sports/${league.oddsApiKey}/odds/?apiKey=${apiKey}&regions=eu&markets=h2h&oddsFormat=decimal`;
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`The Odds API request failed for ${league.name}: ${res.status}`);
      continue;
    }
    const events = (await res.json()) as Array<{
      id: string;
      commence_time: string;
      home_team: string;
      away_team: string;
      bookmakers: Array<{
        key: string;
        title: string;
        markets: Array<{ key: string; outcomes: Array<{ name: string; price: number }> }>;
      }>;
    }>;

    for (const event of events) {
      if (new Date(event.commence_time) > horizon) continue; // keep only near-term matches

      // The Odds API is the source of truth for fixture identity here — API-Football's free tier
      // only covers historical seasons (2021-2024), so it can't supply current-season fixtures.
      // Upsert by oddsApiId (the natural key for this source) and create the Team/Fixture rows
      // directly from the odds event if this is the first time we've seen it.
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

      const isFirstSnapshotForFixture =
        (await prisma.oddsSnapshot.count({ where: { fixtureId: fixture.id } })) === 0;

      for (const bookmaker of event.bookmakers) {
        const market = bookmaker.markets.find((m) => m.key === "h2h");
        if (!market) continue;
        const home = market.outcomes.find((o) => o.name === event.home_team)?.price;
        const away = market.outcomes.find((o) => o.name === event.away_team)?.price;
        const draw = market.outcomes.find((o) => o.name === "Draw")?.price;
        if (!home || !away) continue;

        const implied = deVig({ home, draw, away });

        await prisma.oddsSnapshot.create({
          data: {
            fixtureId: fixture.id,
            bookmaker: bookmaker.title,
            homeOdds: home,
            drawOdds: draw ?? null,
            awayOdds: away,
            impliedHomeProb: implied.home,
            impliedDrawProb: implied.draw ?? null,
            impliedAwayProb: implied.away,
            isOpeningLine: isFirstSnapshotForFixture,
          },
        });
        count += 1;
      }
    }
  }

  return { snapshots: count };
}

/** Find-or-create a Team by name — The Odds API identifies teams by name only, no stable id. */
async function upsertTeamByName(name: string, league: string, country: string) {
  const existing = await prisma.team.findFirst({ where: { name, league } });
  if (existing) return existing;
  return prisma.team.create({ data: { name, shortName: name, league, country } });
}
