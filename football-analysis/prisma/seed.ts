import "dotenv/config";
import { prisma } from "@/lib/db";
import { ingestFixtures } from "@/lib/ingestion/fixtures";
import { ingestOdds } from "@/lib/ingestion/odds";
import { ingestLineups } from "@/lib/ingestion/lineups";
import { ingestNews } from "@/lib/ingestion/news";
import { analyzeFixture } from "@/lib/analysis/analyze";
import { FixtureStatus, PickResult } from "@/lib/constants";

async function main() {
  console.log("Seeding today's matchday from mock data...");
  const fx = await ingestFixtures();
  console.log(`  teams: ${fx.teams}, fixtures: ${fx.fixtures}`);
  const odds = await ingestOdds();
  console.log(`  odds snapshots: ${odds.snapshots}, market quotes: ${odds.quotes}`);
  const lineups = await ingestLineups();
  console.log(`  lineups: ${lineups.upserts}`);
  const news = await ingestNews();
  console.log(`  news items: ${news.upserts}`);

  console.log("Running the value model on today's fixtures...");
  const fixtures = await prisma.fixture.findMany({ where: { status: FixtureStatus.SCHEDULED } });
  let totalPicks = 0;
  for (const fixture of fixtures) {
    const r = await analyzeFixture(fixture.id);
    if (r) totalPicks += r.picks;
  }
  console.log(`  analyzed ${fixtures.length} fixtures → ${totalPicks} recommended bets`);

  console.log("Seeding a few days of settled bet history...");
  await seedHistory();

  console.log("Done.");
}

/**
 * Demo-only synthetic history: fabricates finished fixtures and already-graded single Picks for
 * the past few days so the History screen has something to show on a fresh install. Real
 * settlement (lib/analysis/settlement.ts) grades picks from actual finished fixtures.
 */
async function seedHistory() {
  const teamPairs: Array<[string, string, string]> = [
    ["arsenal", "man-utd", "Premier League"],
    ["barcelona", "valencia", "La Liga"],
    ["inter-milan", "roma", "Serie A"],
    ["bayern-munich", "frankfurt", "Bundesliga"],
    ["psg", "marseille", "Ligue 1"],
  ];

  // Each entry: [dayOffset, [ {market, side, line, odds, result} ... ] ]
  const days: Array<{ offset: number; bets: Array<{ market: string; side: string; line: number | null; odds: number; result: string }> }> = [
    {
      offset: -1,
      bets: [
        { market: "AH", side: "HOME", line: -0.5, odds: 1.95, result: PickResult.WON },
        { market: "OU", side: "OVER", line: 2.5, odds: 1.9, result: PickResult.WON },
        { market: "AH", side: "AWAY", line: 0.5, odds: 2.0, result: PickResult.HALF_WON },
      ],
    },
    {
      offset: -2,
      bets: [
        { market: "AH", side: "HOME", line: -1.0, odds: 2.05, result: PickResult.LOST },
        { market: "H2H", side: "HOME", line: null, odds: 2.4, result: PickResult.WON },
      ],
    },
    {
      offset: -3,
      bets: [
        { market: "OU", side: "UNDER", line: 2.5, odds: 1.95, result: PickResult.WON },
        { market: "AH", side: "AWAY", line: -0.25, odds: 1.88, result: PickResult.HALF_LOST },
        { market: "AH", side: "HOME", line: -0.75, odds: 1.9, result: PickResult.LOST },
      ],
    },
  ];

  for (const day of days) {
    const dayDate = new Date();
    dayDate.setHours(0, 0, 0, 0);
    dayDate.setDate(dayDate.getDate() + day.offset);

    for (let i = 0; i < day.bets.length; i++) {
      const bet = day.bets[i];
      const [homeSlug, awaySlug, league] = teamPairs[i % teamPairs.length];
      const fixtureId = `fx-hist-${day.offset}-${i}`;

      await prisma.fixture.upsert({
        where: { id: fixtureId },
        update: {},
        create: {
          id: fixtureId,
          homeTeamId: homeSlug,
          awayTeamId: awaySlug,
          league,
          kickoffAt: new Date(dayDate.getTime() + (12 + i) * 60 * 60 * 1000),
          status: FixtureStatus.FINISHED,
          homeScore: 2,
          awayScore: 1,
        },
      });

      await prisma.pick.create({
        data: {
          fixtureId,
          date: dayDate,
          market: bet.market,
          side: bet.side,
          line: bet.line,
          odds: bet.odds,
          bookmaker: "SoftBook",
          modelProb: 0.55,
          fairProb: 0.5,
          edge: 0.05,
          confidence: 62,
          reasoning: "ตัวอย่างประวัติ (seed)",
          result: bet.result,
          profitLossUnits: profitFor(bet.result, bet.odds),
          settledAt: dayDate,
        },
      });
    }
  }
}

function profitFor(result: string, odds: number): number {
  switch (result) {
    case PickResult.WON:
      return odds - 1;
    case PickResult.HALF_WON:
      return (odds - 1) / 2;
    case PickResult.PUSH:
    case PickResult.VOID:
      return 0;
    case PickResult.HALF_LOST:
      return -0.5;
    default:
      return -1;
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
