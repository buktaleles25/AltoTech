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
  { oddsApiKey: "soccer_france_ligue_one", footballDataCode: "FL1", name: "Ligue 1", country: "France", defaultTotalGoals: 2.6 },
  { oddsApiKey: "soccer_netherlands_eredivisie", footballDataCode: "DED", name: "Eredivisie", country: "Netherlands", defaultTotalGoals: 3.2 },
  { oddsApiKey: "soccer_portugal_primeira_liga", footballDataCode: "PPL", name: "Primeira Liga", country: "Portugal", defaultTotalGoals: 2.5 },
  { oddsApiKey: "soccer_efl_champ", footballDataCode: "ELC", name: "Championship", country: "England", defaultTotalGoals: 2.5 },
  { oddsApiKey: "soccer_brazil_campeonato", footballDataCode: "BSA", name: "Brasileirão Série A", country: "Brazil", defaultTotalGoals: 2.4 },
  { oddsApiKey: "soccer_conmebol_copa_libertadores", footballDataCode: "CLI", name: "Copa Libertadores", country: "South America", defaultTotalGoals: 2.4 },
  // Summer-active leagues NOT on football-data.org free tier → market-only model:
  { oddsApiKey: "soccer_usa_mls", footballDataCode: undefined, name: "MLS", country: "USA", defaultTotalGoals: 3.0 },
  { oddsApiKey: "soccer_korea_kleague1", footballDataCode: undefined, name: "K League 1", country: "South Korea", defaultTotalGoals: 2.5 },
  { oddsApiKey: "soccer_norway_eliteserien", footballDataCode: undefined, name: "Eliteserien", country: "Norway", defaultTotalGoals: 3.0 },
  { oddsApiKey: "soccer_sweden_allsvenskan", footballDataCode: undefined, name: "Allsvenskan", country: "Sweden", defaultTotalGoals: 2.9 },
] as const;

/** Fallback expected total goals for any league not in the table above. */
export const DEFAULT_TOTAL_GOALS = 2.6;

/** Minimum expected value (per unit stake at best price) for a bet to be recommended. */
export const VALUE_EDGE_THRESHOLD = 0.012;

/** Minimum confidence (0-100) for a Pick to be surfaced on the daily board. */
export const MIN_PICK_CONFIDENCE = 45;

/**
 * Ranking multiplier that favours the cleaner two-way markets (Asian Handicap, Over/Under) over
 * three-way 1X2 at equal EV — a two-way bet has lower margin and lower variance, so equal EV
 * there is a better bet. This also aligns the board with the handicap/total markets punters use.
 */
export const TWO_WAY_MARKET_PREFERENCE = 1.25;

/** Max recommended bets stored per fixture (the best few by EV×confidence). */
export const MAX_PICKS_PER_FIXTURE = 3;

/**
 * Longshot odds cap for recommendations. A high "EV" on a 5.00+ underdog is almost always just
 * one soft book pricing a longshot generously — the noisiest, highest-variance kind of value.
 * Capping keeps recommendations on the tighter, more reliable lines (Asian Handicap, totals,
 * short-priced 1X2), which is also the market punters actually use.
 */
export const MAX_PICK_ODDS = 4.5;

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
 * Max confidence points (±) a steam move can add or subtract. Line movement is real information —
 * sharp money moves prices — so a move toward our pick validates it and a move against it is a
 * warning, but it stays a modifier, never the primary signal.
 */
export const STEAM_CONFIDENCE_WEIGHT = 8;

/**
 * Minimum odds for a recommendation. Below ~1.5 the juice dominates: the market prices heavy
 * favourites extremely accurately, tiny model noise creates phantom "value", and the payout isn't
 * worth a bill to a punter anyway.
 */
export const MIN_PICK_ODDS = 1.5;

/** Fraction of full Kelly used for suggested stakes (quarter-Kelly — standard prudent sizing). */
export const KELLY_FRACTION = 0.25;

/** Suggested-stake bounds in units (1u = the flat stake used on the history page). */
export const MIN_STAKE_UNITS = 0.25;
export const MAX_STAKE_UNITS = 2;

/**
 * How far ahead `/api/analyze/run` re-analyzes fixtures to keep the Fixtures browse list fresh.
 * The daily board itself only ever shows same-day kickoffs.
 */
export const ANALYZE_LOOKAHEAD_DAYS = 3;
