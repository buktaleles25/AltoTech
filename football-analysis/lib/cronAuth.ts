import { NextRequest, NextResponse } from "next/server";

/** Shared-secret guard for the ingest/analyze endpoints the scheduler calls — not meant to be public. */
export function requireCronSecret(request: NextRequest): NextResponse | null {
  const expected = process.env.CRON_SECRET;
  const provided = request.headers.get("x-cron-secret");
  if (!expected || provided !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
