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
 * - apiFootballLeagueId: numeric league id used by API-Football (RapidAPI)
 */
export const TRACKED_LEAGUES = [
  { oddsApiKey: "soccer_epl", apiFootballLeagueId: 39, name: "Premier League", country: "England" },
  { oddsApiKey: "soccer_spain_la_liga", apiFootballLeagueId: 140, name: "La Liga", country: "Spain" },
  { oddsApiKey: "soccer_italy_serie_a", apiFootballLeagueId: 135, name: "Serie A", country: "Italy" },
  { oddsApiKey: "soccer_germany_bundesliga", apiFootballLeagueId: 78, name: "Bundesliga", country: "Germany" },
  { oddsApiKey: "soccer_uefa_champs_league", apiFootballLeagueId: 2, name: "Champions League", country: "Europe" },
] as const;

/** Minimum edge (model probability − implied probability) to count as a value pick. */
export const VALUE_EDGE_THRESHOLD = 0.03;

/** Minimum confidence (0-100) a leg needs to be included in the Step 5 without a low-confidence flag. */
export const MIN_STEP_CONFIDENCE = 50;

/** Odds-implied-probability shift (absolute) between opening and current line that counts as a "steam move". */
export const STEAM_MOVE_THRESHOLD = 0.03;

export const LEGS_PER_STEP = 5;

/** Appended to a StepLeg's reasoning text when it's a fallback fill that didn't clear the value/confidence bar. */
export const LOW_CONFIDENCE_FILL_MARKER = "[[low-confidence-fill]]";
