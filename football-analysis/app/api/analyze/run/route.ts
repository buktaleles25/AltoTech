import { NextRequest, NextResponse } from "next/server";
import { requireCronSecret } from "@/lib/cronAuth";
import { prisma } from "@/lib/db";
import { analyzeFixture } from "@/lib/analysis/analyze";
import { buildDailyStep } from "@/lib/analysis/stepBuilder";
import { settlePendingSteps } from "@/lib/analysis/settlement";
import { FixtureStatus } from "@/lib/constants";

/**
 * Full daily pipeline: re-analyze every scheduled fixture with odds data, rebuild today's
 * Step 5 from the fresh predictions, and settle any pending Steps whose fixtures have finished.
 */
async function handler(request: NextRequest) {
  const unauthorized = requireCronSecret(request);
  if (unauthorized) return unauthorized;

  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

  const fixtures = await prisma.fixture.findMany({
    where: { status: FixtureStatus.SCHEDULED, kickoffAt: { gte: dayStart, lt: dayEnd } },
  });

  let analyzed = 0;
  for (const fixture of fixtures) {
    const result = await analyzeFixture(fixture.id);
    if (result) analyzed += 1;
  }

  const step = await buildDailyStep(dayStart);
  const settlement = await settlePendingSteps();

  return NextResponse.json({ ok: true, analyzed, step, settlement });
}

// POST: called by worker/scheduler.ts and manual curl. GET: Vercel Cron always calls via GET.
export const POST = handler;
export const GET = handler;
