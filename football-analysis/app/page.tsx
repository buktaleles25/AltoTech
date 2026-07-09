import Link from "next/link";
import { prisma } from "@/lib/db";
import PickCard, { type PickCardData } from "@/components/PickCard";
import DisclaimerNote from "@/components/DisclaimerNote";
import { formatMatchDate } from "@/lib/format";

// Reads today's recommended value bets straight from the DB (changes through the day) — never
// freeze as a static build-time snapshot.
export const dynamic = "force-dynamic";

export default async function TodayPage(props: PageProps<"/">) {
  const params = await props.searchParams;
  const when = params.when === "today" ? "today" : "upcoming";

  const now = new Date();
  let windowEnd: Date;
  if (when === "today") {
    // Only kickoffs before midnight tonight (local server time).
    windowEnd = new Date(now);
    windowEnd.setHours(23, 59, 59, 999);
  } else {
    windowEnd = new Date(now);
    windowEnd.setHours(0, 0, 0, 0);
    windowEnd.setDate(windowEnd.getDate() + 3); // upcoming value bets over the next few days
  }

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

  return (
    <div className="flex flex-1 flex-col px-4 pt-[calc(1.25rem+env(safe-area-inset-top))]">
      <header className="mb-4">
        <p className="text-xs font-medium uppercase tracking-wide text-accent">บิลเด็ด</p>
        <h1 className="text-2xl font-bold text-text-primary">{formatMatchDate(now)}</h1>
        <p className="mt-1 text-sm text-text-secondary">
          คู่ที่ระบบเจอ &ldquo;value&rdquo; จากราคาน้ำจริง — บอกเลยว่าเล่นตลาดไหน เส้นไหน ที่ราคาน้ำเท่าไหร่
          และเจ้าไหนให้ราคาดีสุด แต่ละบิลเล่นแยกกันได้ (คู่ที่มีหลายตัวเลือก แตะเข้าไปดูครบได้)
        </p>
      </header>

      <FilterTabs when={when} />

      {groups.length === 0 ? (
        <EmptyState when={when} />
      ) : (
        <section className="mt-4 flex flex-col gap-3 pb-4">
          {groups.map((g) => (
            <PickCard key={g.best.id} pick={g.best} extraCount={g.extraCount} />
          ))}
        </section>
      )}

      <DisclaimerNote />
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

function EmptyState({ when }: { when: "today" | "upcoming" }) {
  return (
    <div className="mt-8 rounded-2xl border border-dashed border-border-subtle p-6 text-center">
      <p className="text-sm text-text-secondary">
        {when === "today" ? "วันนี้ยังไม่มีบิลที่ผ่านเกณฑ์" : "ช่วงนี้ยังไม่มีบิลที่ผ่านเกณฑ์"}
      </p>
      <p className="mt-1 text-xs text-text-muted">
        ระบบจะแนะนำเฉพาะบิลที่มี value จริง (ราคาน้ำคุ้มกว่าที่ควรจะเป็น) — ถ้าวันไหนตลาดตั้งราคาแม่นหมด ก็จะไม่ฝืนแนะนำ
        {when === "today" && " ลองแท็บ “เร็ว ๆ นี้” สำหรับคู่ที่กำลังจะมาถึง"}
      </p>
    </div>
  );
}
