import { NextRequest, NextResponse } from "next/server";
import { requireCronSecret } from "@/lib/cronAuth";
import { ingestFixtures } from "@/lib/ingestion/fixtures";

export async function POST(request: NextRequest) {
  const unauthorized = requireCronSecret(request);
  if (unauthorized) return unauthorized;

  const result = await ingestFixtures();
  return NextResponse.json({ ok: true, ...result });
}
