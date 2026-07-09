import { prisma } from "@/lib/db";
import {
  FixtureStatus,
  LEGS_PER_STEP,
  LOW_CONFIDENCE_FILL_MARKER,
  MIN_STEP_CONFIDENCE,
  Selection,
  STEP_LOOKAHEAD_DAYS,
  VALUE_EDGE_THRESHOLD,
} from "@/lib/constants";

export type Candidate = {
  fixtureId: string;
  selection: string;
  edge: number;
  confidence: number;
  odds: number;
  reasoning: string;
  qualifies: boolean;
};

export type SelectedLeg = Candidate & { reasoning: string };

/**
 * Pure selection logic, split out from the DB I/O in `buildDailyStep` so it's unit-testable
 * without a database: ranks candidates by edge×confidence, takes up to LEGS_PER_STEP qualifying
 * picks, and fills any remaining slots with the next-best non-qualifying candidates.
 */
export function selectStepLegs(candidates: Candidate[]): { chosen: SelectedLeg[]; isFullStrength: boolean; combinedOdds: number } {
  const sorted = [...candidates].sort((a, b) => b.edge * b.confidence - a.edge * a.confidence);

  const qualifying = sorted.filter((c) => c.qualifies).slice(0, LEGS_PER_STEP);
  const fillIns = sorted.filter((c) => !c.qualifies).slice(0, Math.max(0, LEGS_PER_STEP - qualifying.length));
  const chosen: SelectedLeg[] = [...qualifying, ...fillIns].map((leg) => ({
    ...leg,
    reasoning: leg.qualifies ? leg.reasoning : `${leg.reasoning} ${LOW_CONFIDENCE_FILL_MARKER}`,
  }));
  const isFullStrength = qualifying.length >= LEGS_PER_STEP;
  const combinedOdds = chosen.reduce((product, leg) => product * leg.odds, 1);

  return { chosen, isFullStrength, combinedOdds };
}

/**
 * Assembles the day's Step 5: the highest edge×confidence value pick from each of up to 5
 * different fixtures kicking off that day. One leg per match — never two legs from the same
 * fixture, since correlated legs from one game don't diversify risk the way five different
 * matches do. If fewer than 5 fixtures clear the value/confidence bar, the remaining slots are
 * filled with the next-best available picks and the whole Step is flagged `isFullStrength: false`
 * rather than inventing picks that aren't backed by real value.
 */
export async function buildDailyStep(targetDate: Date = new Date()): Promise<{ stepId: string; legCount: number; isFullStrength: boolean }> {
  const dayStart = new Date(targetDate);
  dayStart.setHours(0, 0, 0, 0);
  const lookaheadEnd = new Date(dayStart.getTime() + STEP_LOOKAHEAD_DAYS * 24 * 60 * 60 * 1000);

  const fixtures = await prisma.fixture.findMany({
    where: { kickoffAt: { gte: new Date(), lt: lookaheadEnd }, status: FixtureStatus.SCHEDULED },
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
