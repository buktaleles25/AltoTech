import { prisma } from "@/lib/db";
import { TRACKED_LEAGUES } from "@/lib/constants";

/**
 * Optional strengthening data source. football-data.org (free tier) gives current-season goals
 * for/against per team for ~12 competitions incl. the World Cup and Brazil. We cache goals/game
 * onto each Team; the analysis model uses it (when present) to nudge its supremacy estimate away
 * from the pure market baseline. Entirely skipped when FOOTBALLDATA_KEY is unset — the model then
 * runs market-only.
 */

const BASE = "https://api.football-data.org/v4";

type Standing = {
  standings: Array<{
    type: string;
    table: Array<{
      team: { name: string };
      playedGames: number;
      goalsFor: number;
      goalsAgainst: number;
    }>;
  }>;
};

export async function ingestTeamStrength(): Promise<{ updated: number; leagues: number }> {
  const key = process.env.FOOTBALLDATA_KEY;
  if (!key) return { updated: 0, leagues: 0 };

  const codes = TRACKED_LEAGUES.map((l) => l.footballDataCode).filter((c): c is NonNullable<typeof c> => c != null);

  let updated = 0;
  let leagues = 0;
  for (const code of codes) {
    let body: Standing;
    try {
      const res = await fetch(`${BASE}/competitions/${code}/standings`, {
        headers: { "X-Auth-Token": key },
      });
      if (!res.ok) {
        console.error(`football-data ${code} standings failed: ${res.status}`);
        continue;
      }
      body = (await res.json()) as Standing;
    } catch (err) {
      console.error(`football-data ${code} fetch error:`, err);
      continue;
    }

    // Prefer the overall "TOTAL" table; some competitions split HOME/AWAY/TOTAL.
    const table = (body.standings.find((s) => s.type === "TOTAL") ?? body.standings[0])?.table ?? [];
    if (table.length === 0) continue;
    leagues += 1;

    const teams = await prisma.team.findMany({ select: { id: true, name: true } });
    for (const row of table) {
      if (row.playedGames <= 0) continue;
      const team = matchTeam(teams, row.team.name);
      if (!team) continue;
      await prisma.team.update({
        where: { id: team.id },
        data: {
          gfPerGame: row.goalsFor / row.playedGames,
          gaPerGame: row.goalsAgainst / row.playedGames,
          strengthUpdatedAt: new Date(),
        },
      });
      updated += 1;
    }
  }

  return { updated, leagues };
}

/** Football-data team names differ from The Odds API's — match on a normalized, suffix-stripped form. */
function matchTeam(teams: { id: string; name: string }[], fdName: string): { id: string; name: string } | null {
  const target = normalizeTeamName(fdName);
  let best: { id: string; name: string } | null = null;
  for (const t of teams) {
    const n = normalizeTeamName(t.name);
    if (n === target) return t;
    if (n.length >= 4 && (n.includes(target) || target.includes(n))) best = best ?? t;
  }
  return best;
}

function normalizeTeamName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip accents
    .toLowerCase()
    .replace(/\b(fc|cf|sc|ac|as|se|cr|afc|club|de|football|calcio)\b/g, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}
