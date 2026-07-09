import { NextRequest, NextResponse } from "next/server";
import { requireCronSecret } from "@/lib/cronAuth";
import { ingestOdds } from "@/lib/ingestion/odds";

export async function POST(request: NextRequest) {
  const unauthorized = requireCronSecret(request);
  if (unauthorized) return unauthorized;

  const result = await ingestOdds();
  return NextResponse.json({ ok: true, ...result });
}
