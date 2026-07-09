import { prisma } from "@/lib/db";
import { readMockJson, USE_MOCK_DATA } from "./util";

type MockLineup = {
  fixtureId: string;
  teamId: string;
  isConfirmed: boolean;
  formation: string | null;
  startingXi: string[];
  missingPlayers: Array<{ name: string; position: string; reason: string }>;
};

/**
 * Upserts confirmed lineups + known absentees per fixture.
 * - Mock mode: from mock/lineups.json.
 * - Real mode: NO-OP for now. No free current-season lineup source (API-Football free tier is
 *   historical-only). When one is added, populate Lineup rows here and the model will use them.
 */
export async function ingestLineups(): Promise<{ upserts: number }> {
  if (USE_MOCK_DATA) return ingestLineupsFromMock();
  return { upserts: 0 };
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
