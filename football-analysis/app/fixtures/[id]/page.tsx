import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import TeamBadge from "@/components/TeamBadge";
import ConfidenceBadge from "@/components/ConfidenceBadge";
import OddsMovementBars from "@/components/OddsMovementBars";
import LineupFormation, { type MissingPlayer } from "@/components/LineupFormation";
import NewsFeedItem from "@/components/NewsFeedItem";
import DisclaimerNote from "@/components/DisclaimerNote";
import { betLabel, formatEdge, formatKickoff, formatMatchDate, formatOdds } from "@/lib/format";

export default async function FixtureDetailPage(props: PageProps<"/fixtures/[id]">) {
  const { id } = await props.params;

  const fixture = await prisma.fixture.findUnique({
    where: { id },
    include: {
      homeTeam: true,
      awayTeam: true,
      oddsSnapshots: { orderBy: { capturedAt: "asc" } },
      lineups: true,
      modelPredictions: { orderBy: { computedAt: "desc" }, take: 1 },
      picks: { orderBy: { edge: "desc" } },
    },
  });

  if (!fixture) notFound();

  const news = await prisma.newsItem.findMany({
    where: { relatedTeamId: { in: [fixture.homeTeamId, fixture.awayTeamId] } },
    orderBy: { publishedAt: "desc" },
    take: 10,
  });

  const opening = fixture.oddsSnapshots.find((s) => s.isOpeningLine);
  const currentSnapshots = fixture.oddsSnapshots.filter((s) => !s.isOpeningLine);
  const current = currentSnapshots.length > 0 ? averageSnapshot(currentSnapshots) : null;
  const prediction = fixture.modelPredictions[0];

  const homeLineup = fixture.lineups.find((l) => l.teamId === fixture.homeTeamId);
  const awayLineup = fixture.lineups.find((l) => l.teamId === fixture.awayTeamId);

  return (
    <div className="flex flex-1 flex-col px-4 pt-[calc(1rem+env(safe-area-inset-top))]">
      <Link href="/" className="mb-3 inline-flex w-fit items-center gap-1 text-xs text-text-muted">
        ← กลับหน้าหลัก
      </Link>

      <header className="rounded-2xl border border-border-subtle bg-surface p-4">
        <p className="text-xs text-text-muted">
          {fixture.league} · {formatMatchDate(fixture.kickoffAt)} · {formatKickoff(fixture.kickoffAt)}
        </p>
        <div className="mt-3 flex items-center justify-between">
          <TeamColumn name={fixture.homeTeam.name} />
          <span className="px-2 text-sm text-text-muted">
            {fixture.status === "FINISHED" ? `${fixture.homeScore} - ${fixture.awayScore}` : "VS"}
          </span>
          <TeamColumn name={fixture.awayTeam.name} />
        </div>
      </header>

      {fixture.picks.length > 0 && (
        <section className="mt-4 rounded-2xl border border-accent-strong/30 bg-gradient-to-br from-accent-soft to-transparent p-4">
          <p className="mb-2 text-sm font-medium text-text-primary">บิลที่ระบบแนะนำ</p>
          <div className="flex flex-col gap-2">
            {fixture.picks.map((pick) => (
              <div key={pick.id} className="flex items-center justify-between gap-2 rounded-xl bg-surface p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-text-primary">
                    {betLabel(pick.market, pick.side, pick.line, fixture.homeTeam.name, fixture.awayTeam.name)}
                  </p>
                  <p className="text-[11px] text-text-muted">
                    ที่ {pick.bookmaker} · EV {formatEdge(pick.edge)} · มั่นใจ {pick.confidence}%
                  </p>
                </div>
                <span className="shrink-0 font-mono text-xl font-bold text-accent">{formatOdds(pick.odds)}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {prediction && (
        <section className="mt-4 rounded-2xl border border-border-subtle bg-surface p-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-medium text-text-primary">บทวิเคราะห์ของระบบ</p>
            <ConfidenceBadge confidence={prediction.confidenceScore} />
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <ProbCell label="เจ้าบ้านชนะ" prob={prediction.modelHomeProb} edge={prediction.edgeHome} />
            <ProbCell label="เสมอ" prob={prediction.modelDrawProb} edge={prediction.edgeDraw} />
            <ProbCell label="ทีมเยือนชนะ" prob={prediction.modelAwayProb} edge={prediction.edgeAway} />
          </div>
          {prediction.expectedGoalsHome != null && prediction.expectedGoalsAway != null && (
            <p className="mt-3 text-[11px] text-text-muted">
              คาดการณ์ประตู (โมเดล): {prediction.expectedGoalsHome.toFixed(2)} - {prediction.expectedGoalsAway.toFixed(2)}
            </p>
          )}
          {prediction.reasoning && <p className="mt-1 text-xs leading-relaxed text-text-secondary">{prediction.reasoning}</p>}
        </section>
      )}

      {fixture.oddsSnapshots.length > 0 && (
        <section className="mt-4 rounded-2xl border border-border-subtle bg-surface p-4">
          <p className="mb-2 text-sm font-medium text-text-primary">ราคาน้ำจากเจ้ามือ</p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-text-muted">
                  <th className="pb-2 font-normal">เจ้ามือ</th>
                  <th className="pb-2 font-normal text-right">1</th>
                  <th className="pb-2 font-normal text-right">X</th>
                  <th className="pb-2 font-normal text-right">2</th>
                </tr>
              </thead>
              <tbody>
                {fixture.oddsSnapshots
                  .slice()
                  .reverse()
                  .map((s) => (
                    <tr key={s.id} className="border-t border-border-subtle">
                      <td className="py-1.5 text-text-secondary">
                        {s.bookmaker}
                        {s.isOpeningLine && <span className="ml-1 text-[10px] text-text-muted">(เปิด)</span>}
                      </td>
                      <td className="py-1.5 text-right font-mono text-text-primary">{formatOdds(s.homeOdds)}</td>
                      <td className="py-1.5 text-right font-mono text-text-primary">{s.drawOdds ? formatOdds(s.drawOdds) : "-"}</td>
                      <td className="py-1.5 text-right font-mono text-text-primary">{formatOdds(s.awayOdds)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {opening && current && (
        <section className="mt-4">
          <OddsMovementBars opening={opening} current={current} />
        </section>
      )}

      <section className="mt-4 flex flex-col gap-3">
        <LineupFormation
          teamName={fixture.homeTeam.name}
          formation={homeLineup?.formation ?? null}
          startingXi={parseJsonArray<string>(homeLineup?.startingXiJson)}
          missingPlayers={parseJsonArray<MissingPlayer>(homeLineup?.missingPlayersJson)}
          isConfirmed={homeLineup?.isConfirmed ?? false}
        />
        <LineupFormation
          teamName={fixture.awayTeam.name}
          formation={awayLineup?.formation ?? null}
          startingXi={parseJsonArray<string>(awayLineup?.startingXiJson)}
          missingPlayers={parseJsonArray<MissingPlayer>(awayLineup?.missingPlayersJson)}
          isConfirmed={awayLineup?.isConfirmed ?? false}
        />
      </section>

      {news.length > 0 && (
        <section className="mt-4">
          <p className="mb-2 text-sm font-medium text-text-primary">ข่าวที่เกี่ยวข้อง</p>
          <div className="flex flex-col gap-2">
            {news.map((item) => (
              <NewsFeedItem key={item.id} item={item} />
            ))}
          </div>
        </section>
      )}

      <DisclaimerNote />
    </div>
  );
}

function TeamColumn({ name }: { name: string }) {
  return (
    <div className="flex flex-1 flex-col items-center gap-2 text-center">
      <TeamBadge name={name} size={44} />
      <p className="text-sm font-medium text-text-primary">{name}</p>
    </div>
  );
}

function ProbCell({ label, prob, edge }: { label: string; prob: number; edge: number }) {
  return (
    <div className="rounded-lg bg-surface-2 p-2">
      <p className="text-text-muted">{label}</p>
      <p className="mt-0.5 font-mono text-sm font-semibold text-text-primary">{(prob * 100).toFixed(0)}%</p>
      <p className={`font-mono text-[10px] ${edge >= 0 ? "text-accent" : "text-danger"}`}>{formatEdge(edge)}</p>
    </div>
  );
}

type SnapshotLike = { impliedHomeProb: number; impliedDrawProb: number | null; impliedAwayProb: number };

function averageSnapshot(snapshots: SnapshotLike[]): SnapshotLike {
  const avg = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length;
  const draws = snapshots.map((s) => s.impliedDrawProb).filter((v): v is number => v != null);
  return {
    impliedHomeProb: avg(snapshots.map((s) => s.impliedHomeProb)),
    impliedDrawProb: draws.length > 0 ? avg(draws) : null,
    impliedAwayProb: avg(snapshots.map((s) => s.impliedAwayProb)),
  };
}

function parseJsonArray<T>(json: string | null | undefined): T[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}
