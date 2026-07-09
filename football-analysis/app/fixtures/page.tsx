import Link from "next/link";
import { prisma } from "@/lib/db";
import TeamBadge from "@/components/TeamBadge";
import DisclaimerNote from "@/components/DisclaimerNote";
import { formatKickoff, formatMatchDate } from "@/lib/format";

// Live fixture/prediction data — must render fresh per request, not a frozen build-time snapshot.
export const dynamic = "force-dynamic";

export default async function FixturesPage() {
  const fixtures = await prisma.fixture.findMany({
    where: { status: "SCHEDULED", kickoffAt: { gte: new Date() } },
    orderBy: { kickoffAt: "asc" },
    include: {
      homeTeam: true,
      awayTeam: true,
      modelPredictions: { orderBy: { computedAt: "desc" }, take: 1 },
    },
  });

  const byLeague = new Map<string, typeof fixtures>();
  for (const fixture of fixtures) {
    const list = byLeague.get(fixture.league) ?? [];
    list.push(fixture);
    byLeague.set(fixture.league, list);
  }

  return (
    <div className="flex flex-1 flex-col px-4 pt-[calc(1.25rem+env(safe-area-inset-top))]">
      <header className="mb-4">
        <h1 className="text-2xl font-bold text-text-primary">ตารางแข่งขัน</h1>
        <p className="mt-1 text-sm text-text-secondary">คู่แข่งขันที่กำลังจะเริ่ม พร้อมสถานะการวิเคราะห์</p>
      </header>

      {fixtures.length === 0 ? (
        <p className="mt-8 text-center text-sm text-text-muted">ยังไม่มีตารางแข่งขันที่ดึงเข้ามา</p>
      ) : (
        <div className="flex flex-col gap-5 pb-4">
          {Array.from(byLeague.entries()).map(([league, list]) => (
            <section key={league}>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-text-muted">{league}</p>
              <div className="flex flex-col gap-2">
                {list.map((fixture) => {
                  const prediction = fixture.modelPredictions[0];
                  return (
                    <Link
                      key={fixture.id}
                      href={`/fixtures/${fixture.id}`}
                      className="flex items-center gap-3 rounded-xl border border-border-subtle bg-surface p-3 transition active:scale-[0.99]"
                    >
                      <div className="w-12 shrink-0 text-center">
                        <p className="text-[10px] text-text-muted">{formatMatchDate(fixture.kickoffAt)}</p>
                        <p className="font-mono text-xs text-text-secondary">{formatKickoff(fixture.kickoffAt)}</p>
                      </div>
                      <TeamBadge name={fixture.homeTeam.name} size={26} />
                      <div className="min-w-0 flex-1 text-sm">
                        <p className="truncate text-text-primary">{fixture.homeTeam.name}</p>
                        <p className="truncate text-text-muted">{fixture.awayTeam.name}</p>
                      </div>
                      {prediction && (
                        <span className="shrink-0 font-mono text-xs font-medium text-text-secondary">
                          {prediction.confidenceScore}%
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      <DisclaimerNote />
    </div>
  );
}
