import "dotenv/config";
import cron from "node-cron";
import { prisma } from "@/lib/db";

const BASE_URL = process.env.WORKER_BASE_URL || "http://localhost:3000";
const CRON_SECRET = process.env.CRON_SECRET;

if (!CRON_SECRET) {
  throw new Error("CRON_SECRET must be set for the worker to authenticate against the app's /api routes.");
}

async function call(path: string) {
  try {
    const res = await fetch(`${BASE_URL}${path}`, { method: "POST", headers: { "x-cron-secret": CRON_SECRET! } });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) console.error(`[worker] ${path} -> ${res.status}`, body);
    else console.log(`[worker] ${path} ->`, body);
  } catch (err) {
    console.error(`[worker] ${path} failed:`, err);
  }
}

// Odds ingestion also creates Team/Fixture rows (The Odds API is the fixture source), covering
// h2h + spreads + totals. Once/day morning pull keeps within the 500 req/month free tier.
cron.schedule("30 6 * * *", () => call("/api/ingest/odds"));

// Build/refresh the day's value bets after the morning odds are in, then notify.
cron.schedule("0 7 * * *", async () => {
  await call("/api/analyze/run");
  await call("/api/push/broadcast-picks");
});

// Background news sweep — free RSS feeds, no rate limit.
cron.schedule("*/30 * * * *", () => call("/api/ingest/news"));

// Near kickoff (within ~75 min): pull a closing-line refresh for the day's markets.
cron.schedule("*/15 * * * *", async () => {
  const soon = new Date(Date.now() + 75 * 60 * 1000);
  const upcoming = await prisma.fixture.count({
    where: { status: "SCHEDULED", kickoffAt: { gte: new Date(), lte: soon } },
  });
  if (upcoming > 0) await call("/api/ingest/odds");
});

// Hourly: re-analyze upcoming fixtures with the latest odds and settle finished picks.
cron.schedule("0 * * * *", () => call("/api/analyze/run"));

console.log(`[worker] scheduler started, targeting ${BASE_URL}`);
