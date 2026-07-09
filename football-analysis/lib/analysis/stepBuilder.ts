import { prisma } from "@/lib/db";
import { FixtureStatus, LEGS_PER_STEP, MIN_STEP_CONFIDENCE, MIN_STEP_LEGS, Selection, VALUE_EDGE_THRESHOLD } from "@/lib/constants";

export type Candidate = {
  fixtureId: string;
  selection: string;
  edge: number;
  confidence: number;
  odds: number;
  reasoning: string;
  qualifies: boolean;
};

export type SelectedLeg = Candidate;

/**
 * Pure selection logic, split out from the DB I/O in `buildDailyStep` so it's unit-testable
 * without a database: ranks the day's qualifying candidates by edge×confidence and takes the
 * top LEGS_PER_STEP. Only candidates that actually clear the value/confidence bar are ever
 * chosen — if fewer than MIN_STEP_LEGS qualify, no Step is published for the day rather than
 * padding it out with picks that don't clear the bar.
 */
export function selectStepLegs(candidates: Candidate[]): { chosen: SelectedLeg[]; isFullStrength: boolean; combinedOdds: number } {
  const qualifying = candidates
    .filter((c) => c.qualifies)
    .sort((a, b) => b.edge * b.confidence - a.edge * a.confidence)
    .slice(0, LEGS_PER_STEP);

  if (qualifying.length < MIN_STEP_LEGS) {
    return { chosen: [], isFullStrength: false, combinedOdds: 1 };
  }

  const isFullStrength = qualifying.length === LEGS_PER_STEP;
  const combinedOdds = qualifying.reduce((product, leg) => product * leg.odds, 1);

  return { chosen: qualifying, isFullStrength, combinedOdds };
}

/**
 * Assembles the day's Step: the highest edge×confidence value picks from different fixtures all
 * kicking off the SAME calendar day, so every leg settles together. One leg per match — never
 * two legs from the same fixture, since correlated legs from one game don't diversify risk the
 * way different matches do. Targets 5 legs; if fewer than MIN_STEP_LEGS matches clear the
 * value/confidence bar that day, no Step is published rather than inventing picks that aren't
 * backed by real value.
 */
export async function buildDailyStep(targetDate: Date = new Date()): Promise<{ stepId: string; legCount: number; isFullStrength: boolean }> {
  const dayStart = new Date(targetDate);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

  const fixtures = await prisma.fixture.findMany({
    where: { kickoffAt: { gte: new Date(), lt: dayEnd }, status: FixtureStatus.SCHEDULED },
    include: {
      oddsSnapshots: { where: { isOpeningLine: false }, orderBy: { capturedAt: "desc" } },
      modelPredictions: { orderBy: { computedAt: "desc" }, take: 1 },
    },
  });

  const candidates: Candidate[] = [];
  for (const fixture of fixtures) {
    const prediction = fixture.modelPredictions[0];
    if (!prediction || fixture.oddsSnapshots.length === 0) continue;

    const outcomes = [
      { selection: Selection.HOME, edge: prediction.edgeHome, odds: average(fixture.oddsSnapshots.map((s) => s.homeOdds)) },
      { selection: Selection.AWAY, edge: prediction.edgeAway, odds: average(fixture.oddsSnapshots.map((s) => s.awayOdds)) },
      ...(fixture.oddsSnapshots.some((s) => s.drawOdds != null)
        ? [
            {
              selection: Selection.DRAW,
              edge: prediction.edgeDraw,
              odds: average(fixture.oddsSnapshots.filter((s) => s.drawOdds != null).map((s) => s.drawOdds as number)),
            },
          ]
        : []),
    ];

    const best = outcomes.reduce((a, b) => (b.edge > a.edge ? b : a));
    const qualifies = best.edge >= VALUE_EDGE_THRESHOLD && prediction.confidenceScore >= MIN_STEP_CONFIDENCE;

    candidates.push({
      fixtureId: fixture.id,
      selection: best.selection,
      edge: best.edge,
      confidence: prediction.confidenceScore,
      odds: best.odds,
      reasoning: prediction.reasoning ?? "",
      qualifies,
    });
  }

  const { chosen, isFullStrength, combinedOdds } = selectStepLegs(candidates);

  const existing = await prisma.step.findUnique({ where: { date: dayStart } });
  if (existing) {
    await prisma.stepLeg.deleteMany({ where: { stepId: existing.id } });
  }

  const step = await prisma.step.upsert({
    where: { date: dayStart },
    update: { combinedOdds, isFullStrength, status: "PENDING", resultOutcome: "PENDING" },
    create: { date: dayStart, combinedOdds, isFullStrength },
  });

  if (chosen.length > 0) {
    await prisma.stepLeg.createMany({
      data: chosen.map((leg) => ({
        stepId: step.id,
        fixtureId: leg.fixtureId,
        selection: leg.selection,
        odds: leg.odds,
        edge: leg.edge,
        confidence: leg.confidence,
        reasoning: leg.reasoning,
      })),
    });
  }

  return { stepId: step.id, legCount: chosen.length, isFullStrength };
}

function average(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length;
}
