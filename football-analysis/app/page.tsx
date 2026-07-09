import { prisma } from "@/lib/db";
import PickCard from "@/components/PickCard";
import DisclaimerNote from "@/components/DisclaimerNote";
import { formatMatchDate } from "@/lib/format";

// Reads today's recommended value bets straight from the DB (changes through the day) — never
// freeze as a static build-time snapshot.
export const dynamic = "force-dynamic";

export default async function TodayPage() {
  const now = new Date();
  const windowEnd = new Date(now);
  windowEnd.setHours(0, 0, 0, 0);
  windowEnd.setDate(windowEnd.getDate() + 3); // upcoming value bets over the next few days

  const picks = await prisma.pick.findMany({
    where: { result: "PENDING", fixture: { kickoffAt: { gte: now } }, date: { lt: windowEnd } },
    include: { fixture: { include: { homeTeam: true, awayTeam: true } } },
  });
  // Soonest kickoff first, then best value within a day.
  picks.sort((a, b) => {
    const dt = new Date(a.fixture.kickoffAt).getTime() - new Date(b.fixture.kickoffAt).getTime();
    if (Math.abs(dt) > 60 * 60 * 1000) return dt;
    return b.edge * b.confidence - a.edge * a.confidence;
  });

  return (
    <div className="flex flex-1 flex-col px-4 pt-[calc(1.25rem+env(safe-area-inset-top))]">
      <header className="mb-4">
        <p className="text-xs font-medium uppercase tracking-wide text-accent">บิลเด็ด</p>
        <h1 className="text-2xl font-bold text-text-primary">{formatMatchDate(now)}</h1>
        <p className="mt-1 text-sm text-text-secondary">
          คู่ที่ระบบเจอ &ldquo;value&rdquo; จากราคาน้ำจริง (ที่กำลังจะเตะเร็ว ๆ นี้) — บอกเลยว่าเล่นตลาดไหน เส้นไหน
          ที่ราคาน้ำเท่าไหร่ และเจ้าไหนให้ราคาดีสุด แต่ละบิลเล่นแยกกันได้
        </p>
      </header>

      {picks.length === 0 ? (
        <EmptyState />
      ) : (
        <section className="flex flex-col gap-3 pb-4">
          {picks.map((pick) => (
            <PickCard key={pick.id} pick={pick} />
          ))}
        </section>
      )}

      <DisclaimerNote />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="mt-8 rounded-2xl border border-dashed border-border-subtle p-6 text-center">
      <p className="text-sm text-text-secondary">วันนี้ยังไม่มีบิลที่ผ่านเกณฑ์</p>
      <p className="mt-1 text-xs text-text-muted">
        ระบบจะแนะนำเฉพาะบิลที่มี value จริง (ราคาน้ำคุ้มกว่าที่ควรจะเป็น) — ถ้าวันไหนตลาดตั้งราคาแม่นหมด ก็จะไม่ฝืนแนะนำ
        ลองดูแท็บ &ldquo;ตารางแข่ง&rdquo; สำหรับคู่ที่กำลังจะมาถึง
      </p>
    </div>
  );
}
