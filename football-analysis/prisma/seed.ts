import "dotenv/config";
import { prisma } from "@/lib/db";
import { ingestFixtures } from "@/lib/ingestion/fixtures";
import { ingestOdds } from "@/lib/ingestion/odds";
import { ingestLineups } from "@/lib/ingestion/lineups";
import { ingestNews } from "@/lib/ingestion/news";
import { analyzeFixture } from "@/lib/analysis/analyze";
import { buildDailyStep } from "@/lib/analysis/stepBuilder";
import { FixtureStatus, LegResult, Selection, StepOutcome, StepStatus } from "@/lib/constants";

async function main() {
  console.log("Seeding today's matchday from mock data...");
  const fixtureResult = await ingestFixtures();
  console.log(`  teams: ${fixtureResult.teams}, fixtures: ${fixtureResult.fixtures}`);

  const oddsResult = await ingestOdds();
  console.log(`  odds snapshots: ${oddsResult.snapshots}`);

  const lineupResult = await ingestLineups();
  console.log(`  lineups: ${lineupResult.upserts}`);

  const newsResult = await ingestNews();
  console.log(`  news items: ${newsResult.upserts}`);

  console.log("Running analysis engine on today's fixtures...");
  const todaysFixtures = await prisma.fixture.findMany({ where: { status: FixtureStatus.SCHEDULED } });
  for (const fixture of todaysFixtures) {
    await analyzeFixture(fixture.id);
  }
  console.log(`  analyzed ${todaysFixtures.length} fixtures`);

  console.log("Building today's Step 5...");
  const step = await buildDailyStep(new Date());
  console.log(`  step ${step.stepId}: ${step.legCount} legs, fullStrength=${step.isFullStrength}`);

  console.log("Seeding 3 days of historical settled Steps for the History screen...");
  await seedHistory();

  console.log("Done.");
}

/**
 * Demo-only synthetic history: fabricates finished fixtures and already-graded Steps for the
 * past 3 days so the History/Performance screen has something to show on a fresh install.
 * Real settlement (lib/analysis/settlement.ts) grades legs from actual finished fixtures —
 * this is purely seed data, not something the ingestion pipeline would produce.
 */
async function seedHistory() {
  const historyTeamPairs: Array<[string, string, string]> = [
    ["arsenal", "man-utd", "Premier League"],
    ["barcelona", "valencia", "La Liga"],
    ["inter-milan", "roma", "Serie A"],
    ["bayern-munich", "frankfurt", "Bundesliga"],
    ["psg", "marseille", "Ligue 1"],
  ];

  // day -1: 5/5 legs correct -> Step WIN
  // day -2: 4/5 legs correct (1 lost) -> Step LOSE
  // day -3: 3/5 legs correct (2 lost) -> Step LOSE
  const days = [
    { offset: -1, wrongLegIndexes: [] as number[] },
    { offset: -2, wrongLegIndexes: [2] },
    { offset: -3, wrongLegIndexes: [1, 4] },
  ];

  for (const day of days) {
    const dayDate = new Date();
    dayDate.setHours(0, 0, 0, 0);
    dayDate.setDate(dayDate.getDate() + day.offset);

    const legsData: Array<{ fixtureId: string; selection: string; odds: number; edge: number; confidence: number }> = [];

    for (let i = 0; i < historyTeamPairs.length; i++) {
      const [homeSlug, awaySlug, league] = historyTeamPairs[i];
      const fixtureId = `fx-hist-${day.offset}-${i}`;
      const selection = i % 3 === 0 ? Selection.HOME : i % 3 === 1 ? Selection.AWAY : Selection.DRAW;
      const wentWrong = day.wrongLegIndexes.includes(i);

      // Score the fixture so `selection` is correct unless this leg is meant to lose.
      const [homeScore, awayScore] = resultFor(selection, wentWrong);

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
          homeScore,
          awayScore,
        },
      });

      legsData.push({ fixtureId, selection, odds: 1.8 + i * 0.3, edge: 0.06 + i * 0.01, confidence: 60 + i * 5 });
    }

    const combinedOdds = legsData.reduce((p, l) => p * l.odds, 1);
    const anyLost = day.wrongLegIndexes.length > 0;
    const wonOdds = legsData
      .filter((_, i) => !day.wrongLegIndexes.includes(i))
      .reduce((p, l) => p * l.odds, 1);

    const step = await prisma.step.upsert({
      where: { date: dayDate },
      update: {},
      create: {
        date: dayDate,
        combinedOdds,
        isFullStrength: true,
        status: StepStatus.SETTLED,
        resultOutcome: anyLost ? StepOutcome.LOSE : StepOutcome.WIN,
      },
    });

    await prisma.stepLeg.deleteMany({ where: { stepId: step.id } });
    await prisma.stepLeg.createMany({
      data: legsData.map((leg, i) => ({
        stepId: step.id,
        fixtureId: leg.fixtureId,
        selection: leg.selection,
        odds: leg.odds,
        edge: leg.edge,
        confidence: leg.confidence,
        legResult: day.wrongLegIndexes.includes(i) ? LegResult.LOST : LegResult.WON,
      })),
    });

    await prisma.stepResult.upsert({
      where: { stepId: step.id },
      update: {},
      create: {
        stepId: step.id,
        profitLossUnits: anyLost ? -1 : wonOdds - 1,
        actualOutcomeJson: JSON.stringify(legsData.map((l, i) => ({ fixtureId: l.fixtureId, won: !day.wrongLegIndexes.includes(i) }))),
      },
    });
  }
}

function resultFor(selection: string, shouldLose: boolean): [number, number] {
  const winning = shouldLose ? flip(selection) : selection;
  if (winning === Selection.HOME) return [2, 1];
  if (winning === Selection.AWAY) return [1, 2];
  return [1, 1];
}

function flip(selection: string): string {
  return selection === Selection.HOME ? Selection.AWAY : Selection.HOME;
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
