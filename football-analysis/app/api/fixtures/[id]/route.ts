import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(_request: NextRequest, ctx: RouteContext<"/api/fixtures/[id]">) {
  const { id } = await ctx.params;

  const fixture = await prisma.fixture.findUnique({
    where: { id },
    include: {
      homeTeam: true,
      awayTeam: true,
      oddsSnapshots: { orderBy: { capturedAt: "asc" } },
      lineups: true,
      modelPredictions: { orderBy: { computedAt: "desc" }, take: 1 },
    },
  });

  if (!fixture) {
    return NextResponse.json({ error: "Fixture not found" }, { status: 404 });
  }

  const news = await prisma.newsItem.findMany({
    where: { relatedTeamId: { in: [fixture.homeTeamId, fixture.awayTeamId] } },
    orderBy: { publishedAt: "desc" },
    take: 10,
  });

  return NextResponse.json({ fixture, news });
}
