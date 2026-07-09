import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const league = request.nextUrl.searchParams.get("league");

  const fixtures = await prisma.fixture.findMany({
    where: {
      status: "SCHEDULED",
      kickoffAt: { gte: new Date() },
      ...(league ? { league } : {}),
    },
    orderBy: { kickoffAt: "asc" },
    include: {
      homeTeam: true,
      awayTeam: true,
      modelPredictions: { orderBy: { computedAt: "desc" }, take: 1 },
    },
    take: 50,
  });

  return NextResponse.json({ fixtures });
}
