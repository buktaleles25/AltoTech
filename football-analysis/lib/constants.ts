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

export const StepStatus = {
  PENDING: "PENDING",
  SETTLED: "SETTLED",
} as const;
export type StepStatus = (typeof StepStatus)[keyof typeof StepStatus];

export const StepOutcome = {
  PENDING: "PENDING",
  WIN: "WIN",
  LOSE: "LOSE",
  VOID: "VOID",
} as const;
export type StepOutcome = (typeof StepOutcome)[keyof typeof StepOutcome];

export const Selection = {
  HOME: "HOME",
  DRAW: "DRAW",
  AWAY: "AWAY",
} as const;
export type Selection = (typeof Selection)[keyof typeof Selection];

export const LegResult = {
  PENDING: "PENDING",
  WON: "WON",
  LOST: "LOST",
  VOID: "VOID",
} as const;
export type LegResult = (typeof LegResult)[keyof typeof LegResult];

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
  { oddsApiKey: "soccer_fifa_world_cup", apiFootballLeagueId: 1, name: "FIFA World Cup", country: "World" },
  { oddsApiKey: "soccer_epl", apiFootballLeagueId: 39, name: "Premier League", country: "England" },
  { oddsApiKey: "soccer_spain_la_liga", apiFootballLeagueId: 140, name: "La Liga", country: "Spain" },
  { oddsApiKey: "soccer_italy_serie_a", apiFootballLeagueId: 135, name: "Serie A", country: "Italy" },
  { oddsApiKey: "soccer_germany_bundesliga", apiFootballLeagueId: 78, name: "Bundesliga", country: "Germany" },
  { oddsApiKey: "soccer_uefa_champs_league", apiFootballLeagueId: 2, name: "Champions League", country: "Europe" },
  // Summer-active leagues (keep the Step 5 populated during the European off-season):
  { oddsApiKey: "soccer_brazil_campeonato", apiFootballLeagueId: 71, name: "Brasileirão Série A", country: "Brazil" },
  { oddsApiKey: "soccer_usa_mls", apiFootballLeagueId: 253, name: "MLS", country: "USA" },
  { oddsApiKey: "soccer_korea_kleague1", apiFootballLeagueId: 292, name: "K League 1", country: "South Korea" },
  { oddsApiKey: "soccer_norway_eliteserien", apiFootballLeagueId: 103, name: "Eliteserien", country: "Norway" },
  { oddsApiKey: "soccer_sweden_allsvenskan", apiFootballLeagueId: 113, name: "Allsvenskan", country: "Sweden" },
] as const;

/** Minimum edge (model probability − implied probability) to count as a value pick. */
export const VALUE_EDGE_THRESHOLD = 0.03;

/** Minimum confidence (0-100) a leg needs to be included in the Step 5 without a low-confidence flag. */
export const MIN_STEP_CONFIDENCE = 50;

/** Odds-implied-probability shift (absolute) between opening and current line that counts as a "steam move". */
export const STEAM_MOVE_THRESHOLD = 0.03;

/** Target legs for a full-strength Step. */
export const LEGS_PER_STEP = 5;

/**
 * The Step only ever draws from a single calendar day's matches, so every leg settles together —
 * mixing kickoff days into one accumulator was confusing. If fewer than this many matches clear
 * the value/confidence bar on a given day, no Step is published that day rather than padding it
 * out with picks that don't actually clear the bar.
 */
export const MIN_STEP_LEGS = 3;

/**
 * How far ahead `/api/analyze/run` re-analyzes fixtures (separate from the Step's same-day
 * window above) — this just keeps the Fixtures browse list populated with fresh predictions for
 * the next few days, it doesn't widen what the Step itself draws from.
 */
export const STEP_LOOKAHEAD_DAYS = 3;
