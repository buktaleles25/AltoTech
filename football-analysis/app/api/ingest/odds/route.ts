import { NextRequest, NextResponse } from "next/server";
import { requireCronSecret } from "@/lib/cronAuth";
import { ingestOdds } from "@/lib/ingestion/odds";

async function handler(request: NextRequest) {
  const unauthorized = requireCronSecret(request);
  if (unauthorized) return unauthorized;

  const result = await ingestOdds();
  return NextResponse.json({ ok: true, ...result });
}

// POST: worker/scheduler.ts + manual curl. GET: Vercel Cron always calls via GET.
export const POST = handler;
export const GET = handler;
