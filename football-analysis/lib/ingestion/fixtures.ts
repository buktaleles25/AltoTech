import { prisma } from "@/lib/db";
import { FixtureStatus, TRACKED_LEAGUES } from "@/lib/constants";
import { apiFootballFetch, hoursFromNow, readMockJson, USE_MOCK_DATA } from "./util";

type MockTeam = {
  id: string;
  name: string;
  shortName: string;
  league: string;
  country: string;
};

type MockFixture = {
  id: string;
  homeTeamId: string;
  awayTeamId: string;
  league: string;
  kickoffOffsetHours: number;
  status: string;
};

/**
 * Pulls today's fixture list for every tracked league and upserts Team + Fixture rows.
 * Real mode: API-Football `/fixtures?date=YYYY-MM-DD&league={id}&season={year}` — one request
 * per tracked league, well within the 100 req/day free-tier budget for a daily 06:00 run.
 */
export async function ingestFixtures(): Promise<{ teams: number; fixtures: number }> {
  if (USE_MOCK_DATA) return ingestFixturesFromMock();
  return ingestFixturesFromApiFootball();
}

async function ingestFixturesFromMock(): Promise<{ teams: number; fixtures: number }> {
  const teams = await readMockJson<MockTeam[]>("teams.json");
  const fixtures = await readMockJson<MockFixture[]>("fixtures.json");

  for (const team of teams) {
    await prisma.team.upsert({
      where: { id: team.id },
      update: { name: team.name, shortName: team.shortName, league: team.league, country: team.country },
      create: {
        id: team.id,
        name: team.name,
        shortName: team.shortName,
        league: team.league,
        country: team.country,
      },
    });
  }

  for (const fixture of fixtures) {
    await prisma.fixture.upsert({
      where: { id: fixture.id },
      update: { status: fixture.status },
      create: {
        id: fixture.id,
        homeTeamId: fixture.homeTeamId,
        awayTeamId: fixture.awayTeamId,
        league: fixture.league,
        kickoffAt: hoursFromNow(fixture.kickoffOffsetHours),
        status: fixture.status,
      },
    });
  }

  return { teams: teams.length, fixtures: fixtures.length };
}

async function ingestFixturesFromApiFootball(): Promise<{ teams: number; fixtures: number }> {
  const season = new Date().getFullYear();
  const date = new Date().toISOString().slice(0, 10);

  let teamCount = 0;
  let fixtureCount = 0;

  for (const league of TRACKED_LEAGUES) {
    const res = await apiFootballFetch(`/fixtures?date=${date}&league=${league.apiFootballLeagueId}&season=${season}`);
    if (!res.ok) {
      console.error(`API-Football fixtures request failed for ${league.name}: ${res.status}`);
      continue;
    }
    const body = (await res.json()) as {
      response: Array<{
        fixture: { id: number; date: string; status: { short: string } };
        teams: {
          home: { id: number; name: string; logo: string };
          away: { id: number; name: string; logo: string };
        };
      }>;
    };

    for (const item of body.response) {
      const home = await upsertApiFootballTeam(item.teams.home, league.name, league.country);
      const away = await upsertApiFootballTeam(item.teams.away, league.name, league.country);
      teamCount += 2;

      await prisma.fixture.upsert({
        where: { apiFootballId: String(item.fixture.id) },
        update: { status: mapApiFootballStatus(item.fixture.status.short) },
        create: {
          apiFootballId: String(item.fixture.id),
          homeTeamId: home.id,
          awayTeamId: away.id,
          league: league.name,
          kickoffAt: new Date(item.fixture.date),
          status: mapApiFootballStatus(item.fixture.status.short),
        },
      });
      fixtureCount += 1;
    }
  }

  return { teams: teamCount, fixtures: fixtureCount };
}

async function upsertApiFootballTeam(
  team: { id: number; name: string; logo: string },
  league: string,
  country: string,
) {
  return prisma.team.upsert({
    where: { apiFootballId: String(team.id) },
    update: { name: team.name, logoUrl: team.logo },
    create: {
      apiFootballId: String(team.id),
      name: team.name,
      shortName: team.name,
      league,
      country,
      logoUrl: team.logo,
    },
  });
}

function mapApiFootballStatus(short: string): string {
  switch (short) {
    case "FT":
    case "AET":
    case "PEN":
      return FixtureStatus.FINISHED;
    case "1H":
    case "2H":
    case "HT":
    case "LIVE":
      return FixtureStatus.LIVE;
    case "PST":
      return FixtureStatus.POSTPONED;
    case "CANC":
    case "ABD":
      return FixtureStatus.CANCELLED;
    default:
      return FixtureStatus.SCHEDULED;
  }
}
