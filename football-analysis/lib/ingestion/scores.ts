import { prisma } from "@/lib/db";
import { FixtureStatus, TRACKED_LEAGUES } from "@/lib/constants";
import { requireEnv, USE_MOCK_DATA } from "./util";

type OddsApiScoreEvent = {
  id: string;
  completed: boolean;
  commence_time: string;
  home_team: string;
  away_team: string;
  scores: Array<{ name: string; score: string }> | null;
};

/** How far back to ask The Odds API for results (max the API allows is 3). */
const SCORES_DAYS_FROM = 3;

/**
 * Marks finished fixtures with their final score so settlement can grade picks (and capture CLV).
 * Uses The Odds API `/scores` endpoint (2 quota credits per league when daysFrom is set) — called
 * ONLY for leagues that actually have a fixture kicked off ≥ 2 hours ago and still not finished,
 * so leagues with nothing to settle cost nothing. Mock mode is a no-op (the seed writes finished
 * fixtures itself).
 */
export async function ingestScores(): Promise<{ leaguesChecked: number; finished: number }> {
  if (USE_MOCK_DATA) return { leaguesChecked: 0, finished: 0 };
  const apiKey = requireEnv("ODDS_API_KEY");

  const staleSince = new Date(Date.now() - 2 * 60 * 60 * 1000);
  const oldestRelevant = new Date(Date.now() - SCORES_DAYS_FROM * 24 * 60 * 60 * 1000);
  const unfinished = await prisma.fixture.findMany({
    where: {
      status: { in: [FixtureStatus.SCHEDULED, FixtureStatus.LIVE] },
      kickoffAt: { gte: oldestRelevant, lte: staleSince },
      oddsApiId: { not: null },
    },
    select: { id: true, league: true, oddsApiId: true },
  });
  if (unfinished.length === 0) return { leaguesChecked: 0, finished: 0 };

  const byLeague = new Map<string, typeof unfinished>();
  for (const f of unfinished) {
    const list = byLeague.get(f.league) ?? [];
    list.push(f);
    byLeague.set(f.league, list);
  }

  let leaguesChecked = 0;
  let finished = 0;
  for (const [leagueName, fixtures] of byLeague) {
    const league = TRACKED_LEAGUES.find((l) => l.name === leagueName);
    if (!league) continue;

    const url = `https://api.the-odds-api.com/v4/sports/${league.oddsApiKey}/scores/?apiKey=${apiKey}&daysFrom=${SCORES_DAYS_FROM}`;
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`The Odds API /scores failed for ${leagueName}: ${res.status}`);
      continue;
    }
    leaguesChecked += 1;
    const events = (await res.json()) as OddsApiScoreEvent[];
    const byId = new Map(events.map((e) => [e.id, e]));

    for (const fixture of fixtures) {
      const event = byId.get(fixture.oddsApiId as string);
      if (!event?.completed || !event.scores) continue;
      const home = Number(event.scores.find((s) => s.name === event.home_team)?.score);
      const away = Number(event.scores.find((s) => s.name === event.away_team)?.score);
      if (!Number.isFinite(home) || !Number.isFinite(away)) continue;

      await prisma.fixture.update({
        where: { id: fixture.id },
        data: { status: FixtureStatus.FINISHED, homeScore: home, awayScore: away },
      });
      finished += 1;
    }
  }

  return { leaguesChecked, finished };
}
