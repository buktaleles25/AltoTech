import { NextRequest, NextResponse } from "next/server";
import { requireCronSecret } from "@/lib/cronAuth";
import { ingestFixtures } from "@/lib/ingestion/fixtures";

async function handler(request: NextRequest) {
  const unauthorized = requireCronSecret(request);
  if (unauthorized) return unauthorized;

  const result = await ingestFixtures();
  return NextResponse.json({ ok: true, ...result });
}

// POST: called by worker/scheduler.ts and manual curl. GET: Vercel Cron always calls via GET.
export const POST = handler;
export const GET = handler;
