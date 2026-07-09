import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const limitParam = request.nextUrl.searchParams.get("limit");
  const limit = Math.min(Number(limitParam) || 30, 100);

  const steps = await prisma.step.findMany({
    where: { status: "SETTLED" },
    orderBy: { date: "desc" },
    take: limit,
    include: {
      legs: { include: { fixture: { include: { homeTeam: true, awayTeam: true } } } },
      result: true,
    },
  });

  const wins = steps.filter((s) => s.resultOutcome === "WIN").length;
  const losses = steps.filter((s) => s.resultOutcome === "LOSE").length;
  const cumulativeUnits = steps.reduce((sum, s) => sum + (s.result?.profitLossUnits ?? 0), 0);

  return NextResponse.json({
    steps,
    summary: { totalSettled: steps.length, wins, losses, winRate: steps.length ? wins / steps.length : 0, cumulativeUnits },
  });
}
