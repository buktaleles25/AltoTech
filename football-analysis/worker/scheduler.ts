import "dotenv/config";
import cron from "node-cron";
import { prisma } from "@/lib/db";

const BASE_URL = process.env.WORKER_BASE_URL || "http://localhost:3000";
const CRON_SECRET = process.env.CRON_SECRET;

if (!CRON_SECRET) {
  throw new Error("CRON_SECRET must be set for the worker to authenticate against the app's /api/ingest and /api/analyze routes.");
}

async function call(path: string) {
  try {
    const res = await fetch(`${BASE_URL}${path}`, { method: "POST", headers: { "x-cron-secret": CRON_SECRET! } });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error(`[worker] ${path} -> ${res.status}`, body);
    } else {
      console.log(`[worker] ${path} ->`, body);
    }
  } catch (err) {
    console.error(`[worker] ${path} failed:`, err);
  }
}

// Daily fixture list for every tracked league.
cron.schedule("0 6 * * *", () => call("/api/ingest/fixtures"));

// Two fixed odds pulls/day (well within The Odds API's 500 req/month free tier — see README),
// timed so the 07:00 analysis run always has same-morning odds to compare against.
cron.schedule("30 6 * * *", () => call("/api/ingest/odds"));
cron.schedule("0 14 * * *", () => call("/api/ingest/odds"));

// Build/refresh the day's Step 5 once fixtures + morning odds are in, then push a notification.
cron.schedule("0 7 * * *", async () => {
  await call("/api/analyze/run");
  await call("/api/push/broadcast-step");
});

// Background news sweep — free RSS feeds, no rate limit.
cron.schedule("*/30 * * * *", () => call("/api/ingest/news"));

// Every 15 minutes: if any fixture kicks off within the next ~75 minutes, pull a closing-line
// odds snapshot and poll for the confirmed lineup (lineups are typically released ~60 min out).
cron.schedule("*/15 * * * *", async () => {
  const soon = new Date(Date.now() + 75 * 60 * 1000);
  const upcoming = await prisma.fixture.count({
    where: { status: "SCHEDULED", kickoffAt: { gte: new Date(), lte: soon } },
  });
  if (upcoming > 0) {
    await call("/api/ingest/odds");
    await call("/api/ingest/lineups");
  }
});

// Hourly: re-analyze fixtures still scheduled today, rebuild the Step 5 with the latest data,
// and settle any pending Steps whose fixtures have finished.
cron.schedule("0 * * * *", () => call("/api/analyze/run"));

console.log(`[worker] scheduler started, targeting ${BASE_URL}`);
