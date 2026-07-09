import type { ThreeWayProbability } from "./devig";

export type TeamForm = { last5Ppg: number; homePpg: number; awayPpg: number };
export type HeadToHead = { teamAWins: number; teamBWins: number; draws: number; sampleSize: number } | null;
export type MissingPlayers = { count: number };

export type ModelInput = {
  home: TeamForm;
  away: TeamForm;
  homeMissing: MissingPlayers;
  awayMissing: MissingPlayers;
  /** From the home team's perspective: positive favours home, negative favours away. */
  h2h: HeadToHead;
  homeLineupConfirmed: boolean;
  awayLineupConfirmed: boolean;
  /** The market's current de-vigged implied probability — the model's prior/anchor. */
  marketImplied: ThreeWayProbability;
};

export type ModelOutput = {
  homeProb: number;
  drawProb: number;
  awayProb: number;
  /** 0-1: how complete/reliable the inputs behind this estimate are. */
  dataCompleteness: number;
  reasoning: string;
};

const MISSING_PLAYER_PENALTY = 0.15;
const MAX_MISSING_PENALTY = 0.6;
const HOME_ADVANTAGE = 0.08;
const STRENGTH_TO_PROB_SCALE = 0.9;
const BASE_DRAW_PROB = 0.28;
const DRAW_DECAY = 0.35;
const H2H_WEIGHT = 0.3;
const MIN_H2H_SAMPLE_FOR_FULL_WEIGHT = 5;

// How much weight the model's own from-scratch strength estimate gets versus the market's own
// de-vigged price. Efficient football markets already price in team strength, form, and home
// advantage far more accurately than a PPG-based formula fed by free data ever could — so the
// market is the prior, and our independent estimate is only a *nudge* on top of it. This is what
// keeps edges realistic (a market-anchored model can't wildly diverge from the market) while
// still letting fresh signals (an unpriced injury, a lopsided h2h) move the needle.
const MARKET_BLEND_WEIGHT = 0.35;

/**
 * Estimates match outcome probabilities by blending an independent, explainable strength model
 * (recent form, home/away split, head-to-head, lineup-driven absence penalties) with the
 * market's own de-vigged implied probability. The blend is deliberately market-anchored rather
 * than a standalone prediction: our free data sources (a handful of PPG numbers) can't out-model
 * an efficient odds market on raw team strength, but they CAN surface information the market may
 * be slow to fully price — most notably a lineup change or head-to-head pattern — which is where
 * genuine edge tends to live.
 */
export function computeModelProbabilities(input: ModelInput): ModelOutput {
  const homeMissingPenalty = Math.min(input.homeMissing.count * MISSING_PLAYER_PENALTY, MAX_MISSING_PENALTY);
  const awayMissingPenalty = Math.min(input.awayMissing.count * MISSING_PLAYER_PENALTY, MAX_MISSING_PENALTY);

  const homeStrength = 0.5 * input.home.last5Ppg + 0.5 * input.home.homePpg - homeMissingPenalty;
  const awayStrength = 0.5 * input.away.last5Ppg + 0.5 * input.away.awayPpg - awayMissingPenalty;

  let h2hTilt = 0;
  if (input.h2h && input.h2h.sampleSize > 0) {
    const h2hSampleWeight = Math.min(input.h2h.sampleSize / MIN_H2H_SAMPLE_FOR_FULL_WEIGHT, 1);
    const h2hDiff = (input.h2h.teamAWins - input.h2h.teamBWins) / input.h2h.sampleSize;
    h2hTilt = h2hDiff * H2H_WEIGHT * h2hSampleWeight;
  }

  const diff = homeStrength - awayStrength + HOME_ADVANTAGE + h2hTilt;

  const homeWinShare = sigmoid(diff * STRENGTH_TO_PROB_SCALE);
  const independentDrawProb = BASE_DRAW_PROB * Math.exp(-DRAW_DECAY * Math.abs(diff));
  const independent = {
    home: homeWinShare * (1 - independentDrawProb),
    draw: independentDrawProb,
    away: (1 - homeWinShare) * (1 - independentDrawProb),
  };

  const blended = blendWithMarket(independent, input.marketImplied);

  const lineupCompleteness = (Number(input.homeLineupConfirmed) + Number(input.awayLineupConfirmed)) / 2;
  const h2hCompleteness = input.h2h ? Math.min(input.h2h.sampleSize / MIN_H2H_SAMPLE_FOR_FULL_WEIGHT, 1) : 0;
  const dataCompleteness = 0.6 * lineupCompleteness + 0.4 * h2hCompleteness;

  const reasoning = buildReasoning({
    diff,
    homeMissing: input.homeMissing.count,
    awayMissing: input.awayMissing.count,
    h2hTilt,
    lineupCompleteness,
  });

  return { homeProb: blended.home, drawProb: blended.draw ?? 0, awayProb: blended.away, dataCompleteness, reasoning };
}

type FullProbability = { home: number; draw: number; away: number };

function blendWithMarket(independent: FullProbability, market: ThreeWayProbability): ThreeWayProbability {
  const w = MARKET_BLEND_WEIGHT;
  const home = w * independent.home + (1 - w) * market.home;
  const away = w * independent.away + (1 - w) * market.away;
  const draw = market.draw != null ? w * independent.draw + (1 - w) * market.draw : independent.draw;

  // Renormalize in case of floating point drift so the three outcomes always sum to exactly 1.
  const sum = home + draw + away;
  return { home: home / sum, draw: draw / sum, away: away / sum };
}

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

function buildReasoning(args: {
  diff: number;
  homeMissing: number;
  awayMissing: number;
  h2hTilt: number;
  lineupCompleteness: number;
}): string {
  const parts: string[] = [];
  if (args.diff > 0.3) parts.push("ฟอร์ม/แต้มต่อเจ้าบ้านเอื้อฝั่งเจ้าบ้าน");
  else if (args.diff < -0.3) parts.push("ฟอร์มเอื้อฝั่งทีมเยือนแม้จะมีแต้มต่อเจ้าบ้าน");
  else parts.push("สองทีมฟอร์มสูสีกัน");

  if (args.homeMissing > 0) parts.push(`เจ้าบ้านขาดผู้เล่นตัวหลัก ${args.homeMissing} คน`);
  if (args.awayMissing > 0) parts.push(`ทีมเยือนขาดผู้เล่นตัวหลัก ${args.awayMissing} คน`);
  if (Math.abs(args.h2hTilt) > 0.05) parts.push(args.h2hTilt > 0 ? "สถิติเจอกันเอื้อเจ้าบ้าน" : "สถิติเจอกันเอื้อทีมเยือน");
  if (args.lineupCompleteness < 1) parts.push("ไลน์อัพยังไม่ยืนยันครบ");

  return parts.join(" · ");
}
