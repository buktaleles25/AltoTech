import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * Recommended value bets, soonest kickoff first.
 * `?when=today` → only kickoffs before midnight tonight; otherwise the next few days (default).
 */
export async function GET(request: Request) {
  const when = new URL(request.url).searchParams.get("when") === "today" ? "today" : "upcoming";

  const now = new Date();
  const windowEnd = new Date(now);
  if (when === "today") {
    windowEnd.setHours(23, 59, 59, 999);
  } else {
    windowEnd.setHours(0, 0, 0, 0);
    windowEnd.setDate(windowEnd.getDate() + 3);
  }

  const picks = await prisma.pick.findMany({
    where: { result: "PENDING", fixture: { kickoffAt: { gte: now, lte: windowEnd } } },
    include: { fixture: { include: { homeTeam: true, awayTeam: true } } },
  });

  picks.sort((a, b) => {
    const dt = new Date(a.fixture.kickoffAt).getTime() - new Date(b.fixture.kickoffAt).getTime();
    if (Math.abs(dt) > 60 * 60 * 1000) return dt;
    return b.edge * b.confidence - a.edge * a.confidence;
  });

  return NextResponse.json({ picks });
}
