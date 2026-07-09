import { prisma } from "@/lib/db";
import { getHeadToHead, getTeamForm } from "@/lib/ingestion/stats";
import { computeConfidenceScore, computeEdges, computeMarketAgreement } from "./edge";
import { computeModelProbabilities } from "./model";
import { detectSteamMove } from "./steamDetect";

export type FixtureAnalysis = {
  fixtureId: string;
  modelHomeProb: number;
  modelDrawProb: number;
  modelAwayProb: number;
  edgeHome: number;
  edgeDraw: number;
  edgeAway: number;
  confidenceScore: number;
  reasoning: string;
};

/**
 * Runs the full value-betting pipeline for a single upcoming fixture: gathers form/h2h/lineup
 * data, estimates model probabilities, compares against the latest real odds, and persists a
 * ModelPrediction row. Returns null if there isn't enough odds data yet to analyze.
 */
export async function analyzeFixture(fixtureId: string): Promise<FixtureAnalysis | null> {
  const fixture = await prisma.fixture.findUnique({
    where: { id: fixtureId },
    include: { lineups: true, oddsSnapshots: { orderBy: { capturedAt: "desc" } } },
  });
  if (!fixture) return null;

  const currentSnapshots = fixture.oddsSnapshots.filter((s) => !s.isOpeningLine);
  const openingSnapshot = fixture.oddsSnapshots.find((s) => s.isOpeningLine);
  if (currentSnapshots.length === 0) return null; // nothing to compare the model against yet

  const currentImplied = {
    home: average(currentSnapshots.map((s) => s.impliedHomeProb)),
    draw: currentSnapshots.some((s) => s.impliedDrawProb != null)
      ? average(currentSnapshots.map((s) => s.impliedDrawProb ?? 0))
      : null,
    away: average(currentSnapshots.map((s) => s.impliedAwayProb)),
  };

  const [homeForm, awayForm, h2h] = await Promise.all([
    getTeamForm(fixture.homeTeamId),
    getTeamForm(fixture.awayTeamId),
    getHeadToHead(fixture.homeTeamId, fixture.awayTeamId),
  ]);

  const homeLineup = fixture.lineups.find((l) => l.teamId === fixture.homeTeamId);
  const awayLineup = fixture.lineups.find((l) => l.teamId === fixture.awayTeamId);
  const homeMissingCount = countMissing(homeLineup?.missingPlayersJson);
  const awayMissingCount = countMissing(awayLineup?.missingPlayersJson);

  const model = computeModelProbabilities({
    home: homeForm,
    away: awayForm,
    homeMissing: { count: homeMissingCount },
    awayMissing: { count: awayMissingCount },
    h2h,
    homeLineupConfirmed: homeLineup?.isConfirmed ?? false,
    awayLineupConfirmed: awayLineup?.isConfirmed ?? false,
    marketImplied: currentImplied,
  });

  const edges = computeEdges(
    { home: model.homeProb, draw: model.drawProb, away: model.awayProb },
    currentImplied,
  );

  const marketAgreement = computeMarketAgreement(currentSnapshots.map((s) => s.impliedHomeProb));
  const confidenceScore = computeConfidenceScore(model.dataCompleteness, marketAgreement);

  let reasoning = model.reasoning;
  if (openingSnapshot) {
    const steam = detectSteamMove(
      {
        home: openingSnapshot.impliedHomeProb,
        draw: openingSnapshot.impliedDrawProb,
        away: openingSnapshot.impliedAwayProb,
      },
      currentImplied,
    );
    if (steam) {
      const outcomeLabel = steam.outcome === "home" ? "เจ้าบ้าน" : steam.outcome === "away" ? "ทีมเยือน" : "เสมอ";
      reasoning += ` · ราคาน้ำขยับแรงเข้าทาง${outcomeLabel} (${(steam.delta * 100).toFixed(1)}pt)`;
    }
  }

  await prisma.modelPrediction.create({
    data: {
      fixtureId,
      modelHomeProb: model.homeProb,
      modelDrawProb: model.drawProb,
      modelAwayProb: model.awayProb,
      edgeHome: edges.home,
      edgeDraw: edges.draw,
      edgeAway: edges.away,
      confidenceScore,
      reasoning,
    },
  });

  return {
    fixtureId,
    modelHomeProb: model.homeProb,
    modelDrawProb: model.drawProb,
    modelAwayProb: model.awayProb,
    edgeHome: edges.home,
    edgeDraw: edges.draw,
    edgeAway: edges.away,
    confidenceScore,
    reasoning,
  };
}

function average(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function countMissing(missingPlayersJson: string | null | undefined): number {
  if (!missingPlayersJson) return 0;
  try {
    const parsed = JSON.parse(missingPlayersJson);
    return Array.isArray(parsed) ? parsed.length : 0;
  } catch {
    return 0;
  }
}
