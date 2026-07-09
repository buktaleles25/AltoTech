import { NextRequest, NextResponse } from "next/server";
import { requireCronSecret } from "@/lib/cronAuth";
import { prisma } from "@/lib/db";

/**
 * Wipes all matchday data (teams, fixtures, odds, lineups, news, predictions, steps) so
 * ingestion can start clean — e.g. clearing seeded mock data before switching a deployment to
 * USE_MOCK_DATA=false. Push subscriptions are left untouched. Cron-secret protected, POST only.
 */
export async function POST(request: NextRequest) {
  const unauthorized = requireCronSecret(request);
  if (unauthorized) return unauthorized;

  await prisma.$transaction([
    prisma.stepResult.deleteMany(),
    prisma.stepLeg.deleteMany(),
    prisma.step.deleteMany(),
    prisma.modelPrediction.deleteMany(),
    prisma.newsItem.deleteMany(),
    prisma.lineup.deleteMany(),
    prisma.oddsSnapshot.deleteMany(),
    prisma.fixture.deleteMany(),
    prisma.team.deleteMany(),
  ]);

  return NextResponse.json({ ok: true, message: "All matchday data wiped." });
}
