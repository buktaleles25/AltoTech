import { prisma } from "@/lib/db";
import PnlChart from "@/components/PnlChart";
import StepHistoryCard from "@/components/StepHistoryCard";
import DisclaimerNote from "@/components/DisclaimerNote";
import { formatMatchDate } from "@/lib/format";

// New Steps get settled over time — must render fresh per request, not a frozen build-time snapshot.
export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const steps = await prisma.step.findMany({
    where: { status: "SETTLED" },
    orderBy: { date: "asc" },
    include: {
      legs: { include: { fixture: { include: { homeTeam: true, awayTeam: true } } } },
      result: true,
    },
  });

  const wins = steps.filter((s) => s.resultOutcome === "WIN").length;
  const losses = steps.filter((s) => s.resultOutcome === "LOSE").length;
  const winRate = steps.length ? (wins / steps.length) * 100 : 0;

  const chartPoints = steps.reduce<Array<{ label: string; cumulativeUnits: number }>>((acc, s) => {
    const previous = acc.length > 0 ? acc[acc.length - 1].cumulativeUnits : 0;
    acc.push({ label: formatMatchDate(s.date), cumulativeUnits: previous + (s.result?.profitLossUnits ?? 0) });
    return acc;
  }, []);

  return (
    <div className="flex flex-1 flex-col px-4 pt-[calc(1.25rem+env(safe-area-inset-top))]">
      <header className="mb-4">
        <h1 className="text-2xl font-bold text-text-primary">สถิติย้อนหลัง</h1>
        <p className="mt-1 text-sm text-text-secondary">ผลลัพธ์จริงของ Step 5 ที่ผ่านมา เพื่อความโปร่งใส</p>
      </header>

      {steps.length === 0 ? (
        <p className="mt-8 text-center text-sm text-text-muted">ยังไม่มีสเต็ปที่ตัดสินผลแล้ว</p>
      ) : (
        <>
          <section className="grid grid-cols-3 gap-2">
            <StatTile label="สเต็ปทั้งหมด" value={String(steps.length)} />
            <StatTile label="อัตราถูก" value={`${winRate.toFixed(0)}%`} />
            <StatTile label="ถูก / พลาด" value={`${wins} / ${losses}`} />
          </section>

          <section className="mt-4 rounded-2xl border border-border-subtle bg-surface p-4">
            <PnlChart points={chartPoints} />
          </section>

          <section className="mt-4 flex flex-col gap-3 pb-4">
            {steps
              .slice()
              .reverse()
              .map((step) => (
                <StepHistoryCard key={step.id} step={step} />
              ))}
          </section>
        </>
      )}

      <DisclaimerNote />
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border-subtle bg-surface p-3 text-center">
      <p className="font-mono text-lg font-semibold text-text-primary">{value}</p>
      <p className="mt-0.5 text-[10px] text-text-muted">{label}</p>
    </div>
  );
}
