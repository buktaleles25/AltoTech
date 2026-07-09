import { NextRequest, NextResponse } from "next/server";

/**
 * Shared-secret guard for the ingest/analyze endpoints — not meant to be public. Accepts either
 * our own `x-cron-secret` header (used by worker/scheduler.ts and manual curl calls) or Vercel
 * Cron's `Authorization: Bearer <CRON_SECRET>` header (Vercel always calls cron paths via GET
 * with that header — see https://vercel.com/docs/cron-jobs/manage-cron-jobs#securing-cron-jobs).
 */
export function requireCronSecret(request: NextRequest): NextResponse | null {
  const expected = process.env.CRON_SECRET;
  const provided = request.headers.get("x-cron-secret") ?? request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!expected || provided !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
