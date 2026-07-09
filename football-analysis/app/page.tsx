import { prisma } from "@/lib/db";
import PickCard from "@/components/PickCard";
import DisclaimerNote from "@/components/DisclaimerNote";
import { formatMatchDate } from "@/lib/format";

// Reads today's recommended value bets straight from the DB (changes through the day) — never
// freeze as a static build-time snapshot.
export const dynamic = "force-dynamic";

export default async function TodayPage() {
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

  const picks = await prisma.pick.findMany({
    where: { date: { gte: dayStart, lt: dayEnd } },
    include: { fixture: { include: { homeTeam: true, awayTeam: true } } },
  });
  picks.sort((a, b) => b.edge * b.confidence - a.edge * a.confidence);

  return (
    <div className="flex flex-1 flex-col px-4 pt-[calc(1.25rem+env(safe-area-inset-top))]">
      <header className="mb-4">
        <p className="text-xs font-medium uppercase tracking-wide text-accent">บิลเด็ดวันนี้</p>
        <h1 className="text-2xl font-bold text-text-primary">{formatMatchDate(dayStart)}</h1>
        <p className="mt-1 text-sm text-text-secondary">
          คู่ที่ระบบเจอ &ldquo;value&rdquo; จากราคาน้ำจริง — บอกเลยว่าเล่นตลาดไหน เส้นไหน ที่ราคาน้ำเท่าไหร่ และเจ้าไหนให้ราคาดีสุด
          แต่ละบิลเล่นแยกกันได้ (ไม่ต้องมัดเป็นสเต็ป)
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
