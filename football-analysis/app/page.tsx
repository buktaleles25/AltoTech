import { prisma } from "@/lib/db";
import LegCard from "@/components/LegCard";
import PayoutCalculator from "@/components/PayoutCalculator";
import DisclaimerNote from "@/components/DisclaimerNote";
import { formatMatchDate } from "@/lib/format";

// This reads today's Step 5 straight from the DB, which changes throughout the day (new
// ingestion/analysis runs) — it must never be frozen as a static build-time snapshot.
export const dynamic = "force-dynamic";

export default async function TodayPage() {
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);

  const step = await prisma.step.findUnique({
    where: { date: dayStart },
    include: {
      legs: {
        include: { fixture: { include: { homeTeam: true, awayTeam: true } } },
        orderBy: { confidence: "desc" },
      },
    },
  });

  return (
    <div className="flex flex-1 flex-col px-4 pt-[calc(1.25rem+env(safe-area-inset-top))]">
      <header className="mb-4">
        <p className="text-xs font-medium uppercase tracking-wide text-accent">Step 5 วันนี้</p>
        <h1 className="text-2xl font-bold text-text-primary">{formatMatchDate(dayStart)}</h1>
        <p className="mt-1 text-sm text-text-secondary">
          คู่ที่เตะวันนี้และระบบวิเคราะห์แล้วว่าราคาน้ำให้ &ldquo;คุณค่า&rdquo; สูงสุด — เทียบจากราคาน้ำจริง ไม่ใช่แค่ทายผลแพ้ชนะ
          ทุกขาเตะวันเดียวกัน จบพร้อมกัน
        </p>
      </header>

      {!step || step.legs.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <section className="rounded-2xl border border-accent-strong/30 bg-gradient-to-br from-accent-soft to-transparent p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-text-secondary">ราคารวม {step.legs.length} คู่</p>
                <p className="font-mono text-3xl font-bold text-text-primary">{step.combinedOdds.toFixed(2)}</p>
              </div>
              {!step.isFullStrength && (
                <span className="rounded-full bg-warning-soft px-3 py-1 text-[11px] font-medium text-warning ring-1 ring-warning/40">
                  วันนี้มีคู่ที่ผ่านเกณฑ์แค่ {step.legs.length} คู่
                </span>
              )}
            </div>
            <PayoutCalculator combinedOdds={step.combinedOdds} />
          </section>

          <section className="mt-4 flex flex-col gap-3 pb-4">
            {step.legs.map((leg, i) => (
              <LegCard key={leg.id} leg={leg} index={i} />
            ))}
          </section>
        </>
      )}

      <DisclaimerNote />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="mt-8 rounded-2xl border border-dashed border-border-subtle p-6 text-center">
      <p className="text-sm text-text-secondary">ยังไม่มี Step สำหรับวันนี้</p>
      <p className="mt-1 text-xs text-text-muted">
        วันนี้อาจมีคู่ที่ผ่านเกณฑ์คุณค่าไม่ถึง 3 คู่ (ต้องมีอย่างน้อย 3 คู่ระบบถึงจะส่ง Step) หรือยังไม่มีการวิเคราะห์รอบล่าสุด
        — ระบบไม่ปั้นคู่ที่ยังไม่ผ่านเกณฑ์มาเติมให้ครบ
      </p>
    </div>
  );
}
