# Step 5 — วิเคราะห์ผลบอลตามราคาน้ำจริง

Mobile-first PWA that analyzes football matches from **real bookmaker odds** — not
just win/lose predictions — and publishes a daily **"Step 5"**: a 5-leg accumulator
of the day's best value picks, each backed by de-vigged implied probability, a
market-anchored model estimate, lineup/injury news, and odds-movement (steam move)
detection.

See `/root/.claude/plans/line-up-zippy-cocke.md` in the original build session for
the full design rationale, or read `app/settings/page.tsx` for the in-app
"how it works" explainer.

**This is an analytics/information tool only.** It does not place bets, accept
wagers, or process payments — see the disclaimer on the Settings screen.

## Stack

- **Next.js 16** (App Router, TypeScript, Turbopack) — frontend + API routes in one app
- **Tailwind CSS v4** — dark, mobile-first UI (see `app/globals.css` for the design tokens)
- **Prisma + SQLite** — zero-infra local DB (`prisma/dev.db`), swap the datasource for Postgres later
- **node-cron** (`worker/scheduler.ts`) — standalone process that drives scheduled ingestion/analysis
- **Web Push** (`web-push` + native browser Push API) — daily Step 5 notification, no paid push service
- **Native PWA** — `app/manifest.ts` + hand-written `public/sw.js` (deliberately NOT using a
  next-pwa-style plugin — those wrap Webpack config, which conflicts with Next 16's
  Turbopack-by-default builds)
- **Vitest** — unit tests for the analysis engine (`lib/analysis/*.test.ts`)

## Quick start (mock data, no API keys needed)

```bash
npm install
npm run db:seed   # applies migrations + seeds a full mock matchday + 3 days of history
npm run dev
```

Open http://localhost:3000 on a mobile viewport (or resize your browser / use DevTools
device mode). `USE_MOCK_DATA=true` in `.env` means everything — fixtures, odds, lineups,
news — comes from `mock/*.json`, so the whole product works end-to-end with zero setup.

To exercise the full pipeline manually against the running dev server:

```bash
CRON_SECRET=$(grep CRON_SECRET .env | cut -d'"' -f2)
curl -X POST localhost:3000/api/ingest/fixtures -H "x-cron-secret: $CRON_SECRET"
curl -X POST localhost:3000/api/ingest/odds     -H "x-cron-secret: $CRON_SECRET"
curl -X POST localhost:3000/api/ingest/lineups  -H "x-cron-secret: $CRON_SECRET"
curl -X POST localhost:3000/api/ingest/news     -H "x-cron-secret: $CRON_SECRET"
curl -X POST localhost:3000/api/analyze/run     -H "x-cron-secret: $CRON_SECRET"
```

Or run the scheduler, which does this on a cron cadence automatically:

```bash
npm run worker
```

## Going live with real data

Set `USE_MOCK_DATA=false` in `.env` and fill in:

| Env var | Where to get it | Free tier |
|---|---|---|
| `ODDS_API_KEY` | [the-odds-api.com](https://the-odds-api.com) — real bookmaker odds | 500 requests/month |
| `APIFOOTBALL_KEY` | [dashboard.api-football.com/register](https://dashboard.api-football.com/register) — fixtures, lineups, injuries, team stats | 100 requests/day |

`APIFOOTBALL_KEY` (direct api-sports.io signup) and `RAPIDAPI_KEY` ([API-Football on
RapidAPI](https://rapidapi.com/api-sports/api/api-football)) are two auth paths to the same
data — `lib/ingestion/util.ts#apiFootballFetch` picks whichever is set (direct key preferred).
Use whichever signup flow actually works for you.

News ingestion (`lib/ingestion/news.ts`) uses free RSS feeds (BBC Sport, ESPN FC, Sky
Sports) — no key required. The ingestion cadence in `worker/scheduler.ts` is deliberately
sparse (2 fixed odds pulls/day + a T-75min closing-line/lineup check) to stay well inside
both free tiers — see the comments in `lib/ingestion/*.ts` for the exact budget math.

For Web Push, generate your own VAPID keypair (the committed `.env` has a working dev
keypair, but you should not reuse it in production):

```bash
npx web-push generate-vapid-keys
```

Put the public key in both `VAPID_PUBLIC_KEY` and `NEXT_PUBLIC_VAPID_PUBLIC_KEY`.

## Architecture

```
app/
  page.tsx                  Today's Step 5 (home screen)
  fixtures/page.tsx          Upcoming fixtures list
  fixtures/[id]/page.tsx     Match detail: odds table, movement chart, lineups, news
  history/page.tsx           Settled Steps + cumulative P/L chart
  settings/page.tsx          Push toggle, methodology explainer, responsible-gambling notice
  api/
    ingest/{fixtures,odds,lineups,news}/route.ts   cron-secret-protected ingestion triggers
    analyze/run/route.ts                            re-analyze + rebuild Step 5 + settle
    steps/{today,history}/route.ts                  public read endpoints
    fixtures/{upcoming,[id]}/route.ts                public read endpoints
    push/{subscribe,broadcast-step}/route.ts         Web Push subscription + daily send
    admin/reset/route.ts                             cron-secret-protected: wipes all matchday data

lib/
  ingestion/        one file per free data source, each with a USE_MOCK_DATA branch
  analysis/
    devig.ts          decimal odds -> de-vigged implied probability
    model.ts           market-anchored model probability (see below)
    edge.ts             value edge + confidence scoring
    steamDetect.ts      opening vs current line movement detection
    analyze.ts           orchestrates the above per fixture, persists ModelPrediction
    stepBuilder.ts       ranks candidates, builds the daily Step 5 (pure logic in selectStepLegs)
    settlement.ts         grades finished fixtures, settles Steps, computes P/L

worker/scheduler.ts   node-cron jobs hitting the ingest/analyze routes on a schedule
prisma/schema.prisma  Team, Fixture, OddsSnapshot, Lineup, NewsItem, ModelPrediction,
                       Step, StepLeg, StepResult, PushSubscription
mock/*.json           one realistic sample matchday + team form/h2h, used both by
                       ingestion (USE_MOCK_DATA=true) and prisma/seed.ts
```

### The value-betting model, briefly

Football odds markets are efficient — a simple PPG-based formula can't out-predict them
from scratch. So `lib/analysis/model.ts` doesn't try to: it computes an independent
strength estimate (recent form, home/away split, head-to-head, lineup-driven absence
penalties), then **blends it with the market's own de-vigged price** (35% independent /
65% market-anchored). This keeps edges realistic (a few percent, not the 15-20% you'd get
from an unanchored model) while still surfacing genuine signal — most notably when
lineup news or head-to-head history diverges from what the market has priced in.

The daily Step 5 (`stepBuilder.ts`) picks the highest edge×confidence leg from each of up
to 5 *different* matches. If fewer than 5 fixtures clear the value/confidence bar that day,
the remaining slots are filled with the next-best picks and the whole Step is flagged
`isFullStrength: false` — the UI shows this honestly instead of fabricating confidence.

## Development

```bash
npm run lint          # ESLint
npx tsc --noEmit       # typecheck
npm test               # vitest unit tests (analysis engine)
npm run build           # production build
npx prisma studio        # browse the SQLite DB
npx prisma migrate reset --force   # wipe + re-migrate + re-seed
```

## Design

Dark-only, mobile-first (`app/layout.tsx` centers content to a `max-w-md` column with a
fixed bottom nav). Palette: near-black background, pitch-green for positive value/edge,
amber for medium confidence, red/rose for negative edge — defined as CSS variables in
`app/globals.css` and exposed as Tailwind utilities (`bg-accent`, `text-warning`, etc.)
via `@theme inline`. Thai UI text uses `Noto Sans Thai` (`next/font/google`) — Geist alone
doesn't shape Thai combining marks/tone vowels correctly.
