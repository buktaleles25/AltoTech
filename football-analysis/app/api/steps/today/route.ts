import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);

  const step = await prisma.step.findUnique({
    where: { date: dayStart },
    include: {
      legs: {
        include: { fixture: { include: { homeTeam: true, awayTeam: true } } },
        orderBy: { confidence: "desc" },
      },
    },
  });

  if (!step) {
    return NextResponse.json({ step: null, message: "No Step 5 generated yet for today." });
  }

  return NextResponse.json({ step });
}
