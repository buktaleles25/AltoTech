import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { bangkokEndOfDay } from "@/lib/time";

/**
 * Recommended value bets, soonest kickoff first.
 * `?when=today` → only kickoffs before midnight tonight (Bangkok time); otherwise the next few
 * days (default). Day boundaries are Thai — the server clock is UTC, 7 hours behind the audience.
 */
export async function GET(request: Request) {
  const when = new URL(request.url).searchParams.get("when") === "today" ? "today" : "upcoming";

  const now = new Date();
  const windowEnd = when === "today" ? bangkokEndOfDay(now) : bangkokEndOfDay(now, 2);

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
