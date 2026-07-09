import { NextRequest, NextResponse } from "next/server";
import { requireCronSecret } from "@/lib/cronAuth";
import { prisma } from "@/lib/db";
import { broadcastPush } from "@/lib/push";

/** Sends the "today's Step 5 is ready" push to every subscribed browser. Called once/day after the morning analysis run. */
export async function POST(request: NextRequest) {
  const unauthorized = requireCronSecret(request);
  if (unauthorized) return unauthorized;

  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const step = await prisma.step.findUnique({ where: { date: dayStart } });

  if (!step) {
    return NextResponse.json({ ok: false, reason: "No Step 5 for today yet" }, { status: 404 });
  }

  const result = await broadcastPush({
    title: "Step 5 วันนี้พร้อมแล้ว ⚽",
    body: `ราคารวม ${step.combinedOdds.toFixed(2)} — ${step.isFullStrength ? "5 คู่ครบตามเกณฑ์" : "มีตัวเลือกสำรองบางคู่"}`,
    url: "/",
  });

  return NextResponse.json({ ok: true, ...result });
}
