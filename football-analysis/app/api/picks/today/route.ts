import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/** Upcoming recommended value bets (next few days), soonest kickoff first. */
export async function GET() {
  const now = new Date();
  const windowEnd = new Date(now);
  windowEnd.setHours(0, 0, 0, 0);
  windowEnd.setDate(windowEnd.getDate() + 3);

  const picks = await prisma.pick.findMany({
    where: { result: "PENDING", fixture: { kickoffAt: { gte: now } }, date: { lt: windowEnd } },
    include: { fixture: { include: { homeTeam: true, awayTeam: true } } },
  });

  picks.sort((a, b) => {
    const dt = new Date(a.fixture.kickoffAt).getTime() - new Date(b.fixture.kickoffAt).getTime();
    if (Math.abs(dt) > 60 * 60 * 1000) return dt;
    return b.edge * b.confidence - a.edge * a.confidence;
  });

  return NextResponse.json({ picks });
}
