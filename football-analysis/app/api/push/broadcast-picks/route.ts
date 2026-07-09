import { NextRequest, NextResponse } from "next/server";
import { requireCronSecret } from "@/lib/cronAuth";
import { prisma } from "@/lib/db";
import { broadcastPush } from "@/lib/push";

/** Pushes "today's value bets are ready" to every subscribed browser. Called once/day after analysis. */
export async function POST(request: NextRequest) {
  const unauthorized = requireCronSecret(request);
  if (unauthorized) return unauthorized;

  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
  const count = await prisma.pick.count({ where: { date: { gte: dayStart, lt: dayEnd } } });

  if (count === 0) {
    return NextResponse.json({ ok: false, reason: "No value bets for today" }, { status: 404 });
  }

  const result = await broadcastPush({
    title: "บิลเด็ดวันนี้มาแล้ว ⚽",
    body: `ระบบเจอ ${count} คู่ที่มี value จากราคาน้ำจริง แตะดูเลย`,
    url: "/",
  });

  return NextResponse.json({ ok: true, count, ...result });
}
