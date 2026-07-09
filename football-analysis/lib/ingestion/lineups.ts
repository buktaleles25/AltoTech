import { prisma } from "@/lib/db";
import { readMockJson, requireEnv, USE_MOCK_DATA } from "./util";

type MockLineup = {
  fixtureId: string;
  teamId: string;
  isConfirmed: boolean;
  formation: string | null;
  startingXi: string[];
  missingPlayers: Array<{ name: string; position: string; reason: string }>;
};

/**
 * Pulls starting XI / confirmed lineups and known absentees per fixture.
 * Real mode: API-Football `/fixtures/lineups?fixture={id}`. Confirmed lineups are typically
 * only published ~60 minutes before kickoff, so the scheduler polls this every 15 minutes
 * starting at T-75min and stops once `isConfirmed` is true for both teams.
 */
export async function ingestLineups(): Promise<{ upserts: number }> {
  if (USE_MOCK_DATA) return ingestLineupsFromMock();
  return ingestLineupsFromApiFootball();
}

async function ingestLineupsFromMock(): Promise<{ upserts: number }> {
  const lineups = await readMockJson<MockLineup[]>("lineups.json");
  let count = 0;

  for (const lineup of lineups) {
    const fixture = await prisma.fixture.findUnique({ where: { id: lineup.fixtureId } });
    if (!fixture) continue;

    await prisma.lineup.upsert({
      where: { fixtureId_teamId: { fixtureId: lineup.fixtureId, teamId: lineup.teamId } },
      update: {
        isConfirmed: lineup.isConfirmed,
        formation: lineup.formation,
        startingXiJson: JSON.stringify(lineup.startingXi),
        missingPlayersJson: JSON.stringify(lineup.missingPlayers),
      },
      create: {
        fixtureId: lineup.fixtureId,
        teamId: lineup.teamId,
        isConfirmed: lineup.isConfirmed,
        formation: lineup.formation,
        startingXiJson: JSON.stringify(lineup.startingXi),
        missingPlayersJson: JSON.stringify(lineup.missingPlayers),
      },
    });
    count += 1;
  }

  return { upserts: count };
}

async function ingestLineupsFromApiFootball(): Promise<{ upserts: number }> {
  const apiKey = requireEnv("RAPIDAPI_KEY");
  const now = new Date();
  const soon = new Date(now.getTime() + 75 * 60 * 1000);

  // Only poll fixtures inside the lineup-release window to stay within the 100 req/day budget.
  const fixtures = await prisma.fixture.findMany({
    where: { kickoffAt: { gte: now, lte: soon }, status: "SCHEDULED" },
  });

  let count = 0;
  for (const fixture of fixtures) {
    if (!fixture.apiFootballId) continue;
    const url = `https://api-football-v1.p.rapidapi.com/v3/fixtures/lineups?fixture=${fixture.apiFootballId}`;
    const res = await fetch(url, {
      headers: { "x-rapidapi-key": apiKey, "x-rapidapi-host": "api-football-v1.p.rapidapi.com" },
    });
    if (!res.ok) continue;

    const body = (await res.json()) as {
      response: Array<{
        team: { id: number };
        formation: string;
        startXI: Array<{ player: { name: string } }>;
      }>;
    };
    if (body.response.length === 0) continue; // not released yet

    for (const teamLineup of body.response) {
      const team = await prisma.team.findFirst({ where: { apiFootballId: String(teamLineup.team.id) } });
      if (!team) continue;

      await prisma.lineup.upsert({
        where: { fixtureId_teamId: { fixtureId: fixture.id, teamId: team.id } },
        update: {
          isConfirmed: true,
          formation: teamLineup.formation,
          startingXiJson: JSON.stringify(teamLineup.startXI.map((p) => p.player.name)),
        },
        create: {
          fixtureId: fixture.id,
          teamId: team.id,
          isConfirmed: true,
          formation: teamLineup.formation,
          startingXiJson: JSON.stringify(teamLineup.startXI.map((p) => p.player.name)),
          missingPlayersJson: "[]",
        },
      });
      count += 1;
    }
  }

  return { upserts: count };
}
