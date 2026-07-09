import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/** All recommended value bets for today, ranked by EV × confidence (best first). */
export async function GET() {
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

  const picks = await prisma.pick.findMany({
    where: { date: { gte: dayStart, lt: dayEnd } },
    include: { fixture: { include: { homeTeam: true, awayTeam: true } } },
  });

  picks.sort((a, b) => b.edge * b.confidence - a.edge * a.confidence);

  return NextResponse.json({ picks });
}
