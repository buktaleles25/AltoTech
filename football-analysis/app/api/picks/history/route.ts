import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/** Settled picks with per-day aggregation and overall record for the History screen. */
export async function GET() {
  const settled = await prisma.pick.findMany({
    where: { result: { not: "PENDING" } },
    include: { fixture: { include: { homeTeam: true, awayTeam: true } } },
    orderBy: { date: "asc" },
  });

  const wins = settled.filter((p) => p.result === "WON" || p.result === "HALF_WON").length;
  const losses = settled.filter((p) => p.result === "LOST" || p.result === "HALF_LOST").length;
  const totalUnits = settled.reduce((sum, p) => sum + (p.profitLossUnits ?? 0), 0);

  return NextResponse.json({
    picks: settled,
    summary: {
      totalSettled: settled.length,
      wins,
      losses,
      winRate: settled.length ? wins / settled.length : 0,
      totalUnits,
    },
  });
}
