import { matchOutcomeProbs, forEachScore, type ScoreMatrix } from "./poisson";

export type Market = "H2H" | "AH" | "OU";
export type Side = "HOME" | "DRAW" | "AWAY" | "OVER" | "UNDER";

/**
 * A settlement "win fraction" in {-1, -0.5, 0, 0.5, 1}:
 *   1  = full win, 0.5 = half win (quarter line), 0 = push (stake back),
 *  -0.5 = half loss, -1 = full loss.
 * Profit per unit stake is derived from this together with the decimal odds — see profitFromFraction.
 */
export type WinFraction = -1 | -0.5 | 0 | 0.5 | 1;

const EPS = 1e-9;

/** True for Asian lines that split the stake across two adjacent half/whole lines (e.g. -0.25, -0.75, 2.25). */
function isQuarterLine(line: number): boolean {
  return Math.round(line * 4) % 2 !== 0;
}

/** Settles a single half/whole Asian Handicap line (no quarter split). `line` is the HOME handicap. */
function ahSingle(margin: number, line: number, side: "HOME" | "AWAY"): -1 | 0 | 1 {
  const t = margin + line; // home-side adjusted margin
  const winning = side === "HOME" ? t : -t;
  if (winning > EPS) return 1;
  if (winning < -EPS) return -1;
  return 0; // push — only reachable on whole-number lines
}

/** Asian Handicap settlement. `line` is the HOME handicap (away line is its negation). */
export function settleAh(margin: number, line: number, side: "HOME" | "AWAY"): WinFraction {
  if (isQuarterLine(line)) {
    const avg = (ahSingle(margin, line - 0.25, side) + ahSingle(margin, line + 0.25, side)) / 2;
    return avg as WinFraction;
  }
  return ahSingle(margin, line, side);
}

function ouSingle(total: number, line: number, side: "OVER" | "UNDER"): -1 | 0 | 1 {
  const t = total - line;
  const winning = side === "OVER" ? t : -t;
  if (winning > EPS) return 1;
  if (winning < -EPS) return -1;
  return 0;
}

/** Over/Under settlement for a totals line. */
export function settleOu(total: number, line: number, side: "OVER" | "UNDER"): WinFraction {
  if (isQuarterLine(line)) {
    const avg = (ouSingle(total, line - 0.25, side) + ouSingle(total, line + 0.25, side)) / 2;
    return avg as WinFraction;
  }
  return ouSingle(total, line, side);
}

/** Profit per one unit staked, given the settled win fraction and the decimal odds taken. */
export function profitFromFraction(fraction: WinFraction, decimalOdds: number): number {
  // A winning share returns (odds-1) profit; a losing/half-losing share just loses the staked fraction.
  return fraction > 0 ? fraction * (decimalOdds - 1) : fraction;
}

export type SettledResult = "WON" | "HALF_WON" | "PUSH" | "HALF_LOST" | "LOST";

export function fractionToResult(fraction: WinFraction): SettledResult {
  if (fraction === 1) return "WON";
  if (fraction === 0.5) return "HALF_WON";
  if (fraction === 0) return "PUSH";
  if (fraction === -0.5) return "HALF_LOST";
  return "LOST";
}

/** Model win-share of a bet in [0,1] (a fair 50/50 line ⇒ ~0.5). Used for display + confidence, not EV. */
function winShare(fraction: WinFraction): number {
  return (fraction + 1) / 2;
}

/**
 * The model's probability-weighted "cover" of a bet: Σ P(score) × winShare(settlement). For a
 * pure two-way half line this equals the model's win probability; for push-able/quarter lines it
 * blends pushes and half-results in. Compared against the market's de-vigged price for the same bet.
 */
export function coverProbability(sm: ScoreMatrix, market: Market, side: Side, line: number | null): number {
  if (market === "H2H") {
    const o = matchOutcomeProbs(sm);
    if (side === "HOME") return o.home;
    if (side === "AWAY") return o.away;
    return o.draw;
  }
  let acc = 0;
  forEachScore(sm, (h, a, p) => {
    const fraction =
      market === "AH"
        ? settleAh(h - a, line as number, side as "HOME" | "AWAY")
        : settleOu(h + a, line as number, side as "OVER" | "UNDER");
    acc += p * winShare(fraction);
  });
  return acc;
}

/**
 * The model's expected profit per unit stake for a bet at the given decimal odds — the exact EV,
 * accounting for pushes and quarter-line half-results. `edge` in the product = this value.
 */
export function expectedProfit(
  sm: ScoreMatrix,
  market: Market,
  side: Side,
  line: number | null,
  decimalOdds: number,
): number {
  if (market === "H2H") {
    return coverProbability(sm, market, side, line) * decimalOdds - 1;
  }
  let ev = 0;
  forEachScore(sm, (h, a, p) => {
    const fraction =
      market === "AH"
        ? settleAh(h - a, line as number, side as "HOME" | "AWAY")
        : settleOu(h + a, line as number, side as "OVER" | "UNDER");
    ev += p * profitFromFraction(fraction, decimalOdds);
  });
  return ev;
}
