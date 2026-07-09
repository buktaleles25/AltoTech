import { prisma } from "@/lib/db";
import { TRACKED_LEAGUES } from "@/lib/constants";
import type { HeadToHead, TeamForm } from "@/lib/analysis/model";
import { apiFootballFetch, readMockJson, USE_MOCK_DATA } from "./util";

type MockForm = Record<string, TeamForm>;
type MockH2H = Array<{ teamAId: string; teamBId: string; teamAWins: number; teamBWins: number; draws: number; sampleSize: number }>;

const FALLBACK_FORM: TeamForm = { last5Ppg: 1.4, homePpg: 1.4, awayPpg: 1.4 };

/**
 * Recent-form PPG (last 5 matches) plus home/away split PPG for a team.
 * Real mode: API-Football `/teams/statistics?team={id}&season={year}&league={id}` — called
 * on-demand at analysis time (not cached in the DB), so keep the daily analysis run to once
 * per matchday to respect the 100 req/day budget alongside fixtures/lineups polling.
 */
export async function getTeamForm(teamId: string): Promise<TeamForm> {
  if (USE_MOCK_DATA) {
    const form = await readMockJson<MockForm>("form.json");
    return form[teamId] ?? FALLBACK_FORM;
  }
  return getTeamFormFromApiFootball(teamId);
}

async function getTeamFormFromApiFootball(teamId: string): Promise<TeamForm> {
  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team?.apiFootballId) return FALLBACK_FORM;

  const league = TRACKED_LEAGUES.find((l) => l.name === team.league);
  if (!league) return FALLBACK_FORM;

  const season = new Date().getFullYear();
  const res = await apiFootballFetch(`/teams/statistics?team=${team.apiFootballId}&season=${season}&league=${league.apiFootballLeagueId}`);
  if (!res.ok) return FALLBACK_FORM;

  const body = (await res.json()) as {
    response: {
      form: string | null;
      fixtures: {
        wins: { home: number; away: number };
        draws: { home: number; away: number };
        loses: { home: number; away: number };
      };
    };
  };
  const r = body.response;
  if (!r) return FALLBACK_FORM;

  const last5Ppg = formStringToPpg(r.form ?? "");
  const homePpg = ppgFromRecord(r.fixtures.wins.home, r.fixtures.draws.home, r.fixtures.loses.home);
  const awayPpg = ppgFromRecord(r.fixtures.wins.away, r.fixtures.draws.away, r.fixtures.loses.away);

  return { last5Ppg: last5Ppg ?? FALLBACK_FORM.last5Ppg, homePpg, awayPpg };
}

function formStringToPpg(form: string): number | null {
  const last5 = form.slice(-5).split("");
  if (last5.length === 0) return null;
  const points = last5.reduce((sum, c) => sum + (c === "W" ? 3 : c === "D" ? 1 : 0), 0);
  return points / last5.length;
}

function ppgFromRecord(wins: number, draws: number, losses: number): number {
  const played = wins + draws + losses;
  if (played === 0) return FALLBACK_FORM.homePpg;
  return (wins * 3 + draws) / played;
}

/**
 * Head-to-head record between two teams (from teamA's perspective).
 * Real mode: API-Football `/fixtures/headtohead?h2h={idA}-{idB}&last=5`.
 */
export async function getHeadToHead(teamAId: string, teamBId: string): Promise<HeadToHead> {
  if (USE_MOCK_DATA) {
    const records = await readMockJson<MockH2H>("h2h.json");
    const direct = records.find((r) => r.teamAId === teamAId && r.teamBId === teamBId);
    if (direct) return direct;
    const reversed = records.find((r) => r.teamAId === teamBId && r.teamBId === teamAId);
    if (reversed) {
      return {
        teamAWins: reversed.teamBWins,
        teamBWins: reversed.teamAWins,
        draws: reversed.draws,
        sampleSize: reversed.sampleSize,
      };
    }
    return null;
  }
  return getHeadToHeadFromApiFootball(teamAId, teamBId);
}

async function getHeadToHeadFromApiFootball(teamAId: string, teamBId: string): Promise<HeadToHead> {
  const [teamA, teamB] = await Promise.all([
    prisma.team.findUnique({ where: { id: teamAId } }),
    prisma.team.findUnique({ where: { id: teamBId } }),
  ]);
  if (!teamA?.apiFootballId || !teamB?.apiFootballId) return null;

  const res = await apiFootballFetch(`/fixtures/headtohead?h2h=${teamA.apiFootballId}-${teamB.apiFootballId}&last=5`);
  if (!res.ok) return null;

  const body = (await res.json()) as {
    response: Array<{
      teams: { home: { id: number; winner: boolean | null }; away: { id: number; winner: boolean | null } };
    }>;
  };
  if (body.response.length === 0) return null;

  let teamAWins = 0;
  let teamBWins = 0;
  let draws = 0;
  for (const fixture of body.response) {
    const aWasHome = String(fixture.teams.home.id) === teamA.apiFootballId;
    const aSide = aWasHome ? fixture.teams.home : fixture.teams.away;
    const bSide = aWasHome ? fixture.teams.away : fixture.teams.home;
    if (aSide.winner === true) teamAWins += 1;
    else if (bSide.winner === true) teamBWins += 1;
    else draws += 1;
  }

  return { teamAWins, teamBWins, draws, sampleSize: body.response.length };
}
