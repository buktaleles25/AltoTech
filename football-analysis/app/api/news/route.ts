import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const teamId = request.nextUrl.searchParams.get("teamId");

  const news = await prisma.newsItem.findMany({
    where: teamId ? { relatedTeamId: teamId } : {},
    orderBy: { publishedAt: "desc" },
    take: 30,
    include: { relatedTeam: true },
  });

  return NextResponse.json({ news });
}
