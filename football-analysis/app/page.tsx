import Link from "next/link";
import { prisma } from "@/lib/db";
import PickCard, { type PickCardData } from "@/components/PickCard";
import DisclaimerNote from "@/components/DisclaimerNote";
import { formatMatchDate } from "@/lib/format";
import { bangkokEndOfDay } from "@/lib/time";

// Reads today's recommended value bets straight from the DB (changes through the day) — never
// freeze as a static build-time snapshot.
export const dynamic = "force-dynamic";

export default async function TodayPage(props: PageProps<"/">) {
  const params = await props.searchParams;
  const when = params.when === "today" ? "today" : "upcoming";

  const now = new Date();
  // Day boundaries in Bangkok time — the server runs UTC, 7 hours behind the audience's clock.
  const windowEnd = when === "today" ? bangkokEndOfDay(now) : bangkokEndOfDay(now, 2);

  const picks = await prisma.pick.findMany({
    where: { result: "PENDING", fixture: { kickoffAt: { gte: now, lte: windowEnd } } },
    include: { fixture: { include: { homeTeam: true, awayTeam: true } } },
  });

  // One card per match: keep the best bet by EV×confidence as the face of the card, count the rest.
  const groups = groupByFixture(picks);
  // Soonest kickoff first, then best value within a day.
  groups.sort((a, b) => {
    const dt = new Date(a.best.fixture.kickoffAt).getTime() - new Date(b.best.fixture.kickoffAt).getTime();
    if (Math.abs(dt) > 60 * 60 * 1000) return dt;
    return b.best.edge * b.best.confidence - a.best.edge * a.best.confidence;
  });

  const todayEnd = bangkokEndOfDay(now);
  const matchesToday = groups.filter((g) => new Date(g.best.fixture.kickoffAt) <= todayEnd).length;
  const avgEv = picks.length > 0 ? picks.reduce((s, p) => s + p.edge, 0) / picks.length : 0;

  return (
    <div className="flex flex-1 flex-col px-4 pt-[calc(1.25rem+env(safe-area-inset-top))]">
      <header className="mb-3">
        <div className="flex items-baseline justify-between">
          <h1 className="text-2xl font-bold text-text-primary">บิลเด็ด</h1>
          <p className="text-sm font-medium text-text-secondary">{formatMatchDate(now)}</p>
        </div>
        <p className="mt-1 text-[13px] leading-relaxed text-text-secondary">
          บิลที่เจอ value จากราคาน้ำจริง — ตลาดไหน เส้นไหน เจ้าไหนให้ราคาดีสุด พร้อมขนาดเดิมพันแนะนำ
        </p>
      </header>

      {picks.length > 0 && (
        <section className="mb-3 grid grid-cols-3 gap-2">
          <StatTile label="บิลแนะนำ" value={String(picks.length)} />
          <StatTile label="EV เฉลี่ย" value={`+${(avgEv * 100).toFixed(1)}%`} accent />
          <StatTile label="คู่วันนี้" value={String(matchesToday)} />
        </section>
      )}

      <FilterTabs when={when} />

      {groups.length === 0 ? (
        <EmptyState
          when={when}
          upcomingCount={
            when === "today"
              ? await prisma.pick.count({
                  where: { result: "PENDING", fixture: { kickoffAt: { gt: windowEnd, lte: bangkokEndOfDay(now, 2) } } },
                })
              : 0
          }
        />
      ) : (
        <section className="mt-3 flex flex-col gap-3 pb-4">
          {groups.map((g) => (
            <PickCard key={g.best.id} pick={g.best} extraCount={g.extraCount} />
          ))}
        </section>
      )}

      <DisclaimerNote />
    </div>
  );
}

function StatTile({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-border-subtle bg-surface p-2.5 text-center">
      <p className={`text-lg font-semibold ${accent ? "text-accent" : "text-text-primary"}`}>{value}</p>
      <p className="mt-0.5 text-[10px] text-text-muted">{label}</p>
    </div>
  );
}

type PickGroup = { best: PickCardData; extraCount: number };

/** Collapse picks to one entry per fixture — best EV×confidence bet as the face, rest counted. */
function groupByFixture(picks: PickCardData[]): PickGroup[] {
  const byFixture = new Map<string, PickCardData[]>();
  for (const pick of picks) {
    const list = byFixture.get(pick.fixture.id);
    if (list) list.push(pick);
    else byFixture.set(pick.fixture.id, [pick]);
  }

  const groups: PickGroup[] = [];
  for (const list of byFixture.values()) {
    list.sort((a, b) => b.edge * b.confidence - a.edge * a.confidence);
    groups.push({ best: list[0], extraCount: list.length - 1 });
  }
  return groups;
}

function FilterTabs({ when }: { when: "today" | "upcoming" }) {
  const base = "flex-1 rounded-lg py-1.5 text-center text-sm font-medium transition";
  const active = "bg-surface text-text-primary";
  const idle = "text-text-muted";
  return (
    <div className="flex gap-1 rounded-xl bg-surface-2 p-1">
      <Link href="/" className={`${base} ${when === "upcoming" ? active : idle}`}>
        เร็ว ๆ นี้
      </Link>
      <Link href="/?when=today" className={`${base} ${when === "today" ? active : idle}`}>
        วันนี้
      </Link>
    </div>
  );
}

function EmptyState({ when, upcomingCount }: { when: "today" | "upcoming"; upcomingCount: number }) {
  return (
    <div className="mt-8 rounded-2xl border border-dashed border-border-subtle p-6 text-center">
      <p className="text-sm text-text-secondary">
        {when === "today" ? "วันนี้ (ตามเวลาไทย) ยังไม่มีบิลที่ผ่านเกณฑ์" : "ช่วงนี้ยังไม่มีบิลที่ผ่านเกณฑ์"}
      </p>
      {when === "today" && upcomingCount > 0 ? (
        <Link href="/" className="mt-3 inline-block rounded-lg bg-accent-soft px-3 py-1.5 text-xs font-semibold text-accent">
          มีบิลวันถัดไปรออยู่ {upcomingCount} ใบ — ดูในแท็บ &ldquo;เร็ว ๆ นี้&rdquo;
        </Link>
      ) : (
        <p className="mt-1 text-xs text-text-muted">
          ระบบจะแนะนำเฉพาะบิลที่มี value จริง (ราคาน้ำคุ้มกว่าที่ควรจะเป็น) — ถ้าวันไหนตลาดตั้งราคาแม่นหมด ก็จะไม่ฝืนแนะนำ
        </p>
      )}
    </div>
  );
}
