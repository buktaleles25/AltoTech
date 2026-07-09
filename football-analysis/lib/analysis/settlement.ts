import { prisma } from "@/lib/db";
import { FixtureStatus, LegResult, Selection, StepOutcome, StepStatus } from "@/lib/constants";

/**
 * Grades every pending leg whose fixture has finished (or was postponed/cancelled), then — once
 * every leg in a Step has a final result — settles the whole Step and records a flat 1-unit-stake
 * P/L for the History screen. Voided legs (postponed/cancelled fixtures) are excluded from the
 * combined-odds multiplication, matching how bookmakers settle accumulators with a void leg.
 */
export async function settlePendingSteps(): Promise<{ legsGraded: number; stepsSettled: number }> {
  const pendingSteps = await prisma.step.findMany({
    where: { status: StepStatus.PENDING },
    include: { legs: { include: { fixture: true } } },
  });

  let legsGraded = 0;
  let stepsSettled = 0;

  for (const step of pendingSteps) {
    for (const leg of step.legs) {
      if (leg.legResult !== LegResult.PENDING) continue;

      if (leg.fixture.status === FixtureStatus.FINISHED) {
        const actual = actualOutcome(leg.fixture.homeScore, leg.fixture.awayScore);
        const legResult = actual === leg.selection ? LegResult.WON : LegResult.LOST;
        await prisma.stepLeg.update({ where: { id: leg.id }, data: { legResult } });
        legsGraded += 1;
      } else if (leg.fixture.status === FixtureStatus.POSTPONED || leg.fixture.status === FixtureStatus.CANCELLED) {
        await prisma.stepLeg.update({ where: { id: leg.id }, data: { legResult: LegResult.VOID } });
        legsGraded += 1;
      }
    }

    const refreshedLegs = await prisma.stepLeg.findMany({ where: { stepId: step.id } });
    const allDecided = refreshedLegs.every((l) => l.legResult !== LegResult.PENDING);
    if (!allDecided || refreshedLegs.length === 0) continue;

    const anyLost = refreshedLegs.some((l) => l.legResult === LegResult.LOST);
    const wonLegs = refreshedLegs.filter((l) => l.legResult === LegResult.WON);
    const allVoid = refreshedLegs.every((l) => l.legResult === LegResult.VOID);

    let resultOutcome: string;
    let profitLossUnits: number;
    if (anyLost) {
      resultOutcome = StepOutcome.LOSE;
      profitLossUnits = -1;
    } else if (allVoid) {
      resultOutcome = StepOutcome.VOID;
      profitLossUnits = 0;
    } else {
      resultOutcome = StepOutcome.WIN;
      const settledCombinedOdds = wonLegs.reduce((product, l) => product * l.odds, 1);
      profitLossUnits = settledCombinedOdds - 1;
    }

    await prisma.$transaction([
      prisma.step.update({ where: { id: step.id }, data: { status: StepStatus.SETTLED, resultOutcome } }),
      prisma.stepResult.upsert({
        where: { stepId: step.id },
        update: { actualOutcomeJson: JSON.stringify(refreshedLegs.map((l) => ({ fixtureId: l.fixtureId, legResult: l.legResult }))), profitLossUnits },
        create: {
          stepId: step.id,
          actualOutcomeJson: JSON.stringify(refreshedLegs.map((l) => ({ fixtureId: l.fixtureId, legResult: l.legResult }))),
          profitLossUnits,
        },
      }),
    ]);
    stepsSettled += 1;
  }

  return { legsGraded, stepsSettled };
}

function actualOutcome(homeScore: number | null, awayScore: number | null): string | null {
  if (homeScore == null || awayScore == null) return null;
  if (homeScore > awayScore) return Selection.HOME;
  if (homeScore < awayScore) return Selection.AWAY;
  return Selection.DRAW;
}
