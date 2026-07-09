// SQLite has no native enum support in Prisma, so these are plain strings at
// the DB layer. Treat this file as the single source of truth for valid values.

export const FixtureStatus = {
  SCHEDULED: "SCHEDULED",
  LIVE: "LIVE",
  FINISHED: "FINISHED",
  POSTPONED: "POSTPONED",
  CANCELLED: "CANCELLED",
} as const;
export type FixtureStatus = (typeof FixtureStatus)[keyof typeof FixtureStatus];

/** Bet markets. AH = Asian Handicap (spreads), OU = Over/Under (totals), H2H = 1X2 moneyline. */
export const BetMarket = {
  H2H: "H2H",
  AH: "AH",
  OU: "OU",
} as const;
export type BetMarket = (typeof BetMarket)[keyof typeof BetMarket];

/** Which side of a market a Pick is on. */
export const PickSide = {
  HOME: "HOME",
  DRAW: "DRAW",
  AWAY: "AWAY",
  OVER: "OVER",
  UNDER: "UNDER",
} as const;
export type PickSide = (typeof PickSide)[keyof typeof PickSide];

/** Settlement state of a single Pick (Asian lines can half-win / half-lose / push). */
export const PickResult = {
  PENDING: "PENDING",
  WON: "WON",
  HALF_WON: "HALF_WON",
  PUSH: "PUSH",
  HALF_LOST: "HALF_LOST",
  LOST: "LOST",
  VOID: "VOID",
} as const;
export type PickResult = (typeof PickResult)[keyof typeof PickResult];

/** The Odds API market keys we ingest, and how each maps to our internal market. */
export const ODDS_API_MARKETS = ["h2h", "spreads", "totals"] as const;

/**
 * Leagues tracked by the ingestion jobs.
 * - oddsApiKey: sport key used by The Odds API (https://the-odds-api.com/sports-odds-data/soccer-odds.html)
 * - apiFootballLeagueId: numeric league id used by API-Football (RapidAPI) — only exercised once
 *   the API-Football account is on a plan with current-season access (the free tier is
 *   historical-only, seasons 2021-2024), so these are best-effort and worth double-checking
 *   against API-Football's `/leagues` endpoint when that happens.
 *
 * The big-5 European leagues + Champions League run August-May, so they're empty through the
 * summer — a handful of leagues that are in-season June-August are included too, so the app has
 * real matches to analyze year-round instead of going quiet for three months.
 */
export const TRACKED_LEAGUES = [
  // FIFA World Cup 2026 (Jun 11 - Jul 19) — check this FIRST, it outranks every league in
  // relevance whenever it's actually running.
  // - footballDataCode: competition code on football-data.org (strengthens the model with real
  //   current-season goals data); undefined ⇒ market-only for that league.
  // - defaultTotalGoals: league-average total goals, used as the totals prior when the market has
  //   no Over/Under line for a fixture.
  { oddsApiKey: "soccer_fifa_world_cup", footballDataCode: "WC", name: "FIFA World Cup", country: "World", defaultTotalGoals: 2.6 },
  { oddsApiKey: "soccer_epl", footballDataCode: "PL", name: "Premier League", country: "England", defaultTotalGoals: 2.8 },
  { oddsApiKey: "soccer_spain_la_liga", footballDataCode: "PD", name: "La Liga", country: "Spain", defaultTotalGoals: 2.5 },
  { oddsApiKey: "soccer_italy_serie_a", footballDataCode: "SA", name: "Serie A", country: "Italy", defaultTotalGoals: 2.7 },
  { oddsApiKey: "soccer_germany_bundesliga", footballDataCode: "BL1", name: "Bundesliga", country: "Germany", defaultTotalGoals: 3.1 },
  { oddsApiKey: "soccer_uefa_champs_league", footballDataCode: "CL", name: "Champions League", country: "Europe", defaultTotalGoals: 2.8 },
  { oddsApiKey: "soccer_brazil_campeonato", footballDataCode: "BSA", name: "Brasileirão Série A", country: "Brazil", defaultTotalGoals: 2.4 },
  // Summer-active leagues NOT on football-data.org free tier → market-only model:
  { oddsApiKey: "soccer_usa_mls", footballDataCode: undefined, name: "MLS", country: "USA", defaultTotalGoals: 3.0 },
  { oddsApiKey: "soccer_korea_kleague1", footballDataCode: undefined, name: "K League 1", country: "South Korea", defaultTotalGoals: 2.5 },
  { oddsApiKey: "soccer_norway_eliteserien", footballDataCode: undefined, name: "Eliteserien", country: "Norway", defaultTotalGoals: 3.0 },
  { oddsApiKey: "soccer_sweden_allsvenskan", footballDataCode: undefined, name: "Allsvenskan", country: "Sweden", defaultTotalGoals: 2.9 },
] as const;

/** Fallback expected total goals for any league not in the table above. */
export const DEFAULT_TOTAL_GOALS = 2.6;

/** Minimum expected value (per unit stake at best price) for a bet to be recommended. */
export const VALUE_EDGE_THRESHOLD = 0.02;

/** Minimum confidence (0-100) for a Pick to be surfaced on the daily board. */
export const MIN_PICK_CONFIDENCE = 45;

/** Max recommended bets stored per fixture (the best few by EV); the daily board ranks across all. */
export const MAX_PICKS_PER_FIXTURE = 2;

/** Dixon-Coles low-score correction strength. */
export const DIXON_COLES_RHO = -0.08;

/**
 * Weight on our independent supremacy estimate vs. the market's. Small on purpose: our free-data
 * signal is far thinner than the market's, so we only nudge — we don't override the sharp price.
 */
export const MODEL_SUPREMACY_WEIGHT = 0.25;

/** Odds-implied-probability shift (absolute) between opening and current line that counts as a "steam move". */
export const STEAM_MOVE_THRESHOLD = 0.03;

/**
 * How far ahead `/api/analyze/run` re-analyzes fixtures to keep the Fixtures browse list fresh.
 * The daily board itself only ever shows same-day kickoffs.
 */
export const ANALYZE_LOOKAHEAD_DAYS = 3;
