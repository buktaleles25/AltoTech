import { prisma } from "@/lib/db";
import { hoursFromNow, readMockJson, USE_MOCK_DATA } from "./util";

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
 * Upserts Team + Fixture rows.
 * - Mock mode: from mock/teams.json + mock/fixtures.json.
 * - Real mode: NO-OP. Fixtures come directly from odds ingestion (lib/ingestion/odds.ts), because
 *   the only free fixture source we had (API-Football) is historical-only on its free tier.
 */
export async function ingestFixtures(): Promise<{ teams: number; fixtures: number }> {
  if (USE_MOCK_DATA) return ingestFixturesFromMock();
  return { teams: 0, fixtures: 0 };
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
