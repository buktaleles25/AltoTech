import { NextRequest, NextResponse } from "next/server";
import { requireCronSecret } from "@/lib/cronAuth";
import { prisma } from "@/lib/db";
import { analyzeFixture } from "@/lib/analysis/analyze";
import { settlePendingPicks } from "@/lib/analysis/settlement";
import { ingestTeamStrength } from "@/lib/ingestion/footballData";
import { ingestScores } from "@/lib/ingestion/scores";
import { FixtureStatus, ANALYZE_LOOKAHEAD_DAYS } from "@/lib/constants";

/**
 * Daily pipeline: refresh current-season team strength (football-data.org, if configured),
 * re-analyze every scheduled fixture within the lookahead window into recommended Picks, pull in
 * final scores for fixtures that have ended, then settle any pending Picks (grading + CLV).
 */
async function handler(request: NextRequest) {
  const unauthorized = requireCronSecret(request);
  if (unauthorized) return unauthorized;

  const strength = await ingestTeamStrength();

  const now = new Date();
  const lookaheadEnd = new Date(now.getTime() + ANALYZE_LOOKAHEAD_DAYS * 24 * 60 * 60 * 1000);
  const fixtures = await prisma.fixture.findMany({
    where: { status: FixtureStatus.SCHEDULED, kickoffAt: { gte: now, lt: lookaheadEnd } },
    select: { id: true },
  });

  let analyzed = 0;
  let picks = 0;
  for (const fixture of fixtures) {
    const result = await analyzeFixture(fixture.id);
    if (result) {
      analyzed += 1;
      picks += result.picks;
    }
  }

  const scores = await ingestScores();
  const settlement = await settlePendingPicks();

  return NextResponse.json({ ok: true, strength, analyzed, picks, scores, settlement });
}

// POST: worker/scheduler.ts + manual curl. GET: Vercel Cron always calls via GET.
export const POST = handler;
export const GET = handler;
