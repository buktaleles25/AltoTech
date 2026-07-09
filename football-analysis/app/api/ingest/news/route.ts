import { NextRequest, NextResponse } from "next/server";
import { requireCronSecret } from "@/lib/cronAuth";
import { ingestNews } from "@/lib/ingestion/news";

export async function POST(request: NextRequest) {
  const unauthorized = requireCronSecret(request);
  if (unauthorized) return unauthorized;

  const result = await ingestNews();
  return NextResponse.json({ ok: true, ...result });
}
