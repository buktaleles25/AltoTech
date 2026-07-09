import { NextRequest, NextResponse } from "next/server";
import { requireCronSecret } from "@/lib/cronAuth";
import { ingestLineups } from "@/lib/ingestion/lineups";

export async function POST(request: NextRequest) {
  const unauthorized = requireCronSecret(request);
  if (unauthorized) return unauthorized;

  const result = await ingestLineups();
  return NextResponse.json({ ok: true, ...result });
}
