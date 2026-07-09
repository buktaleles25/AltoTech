import { prisma } from "@/lib/db";
import PnlChart from "@/components/PnlChart";
import DisclaimerNote from "@/components/DisclaimerNote";
import { betLabel, formatMatchDate } from "@/lib/format";

export const dynamic = "force-dynamic";

const RESULT_STYLE: Record<string, { label: string; cls: string }> = {
  WON: { label: "ชนะ", cls: "text-accent" },
  HALF_WON: { label: "ชนะครึ่ง", cls: "text-accent" },
  PUSH: { label: "คืนทุน", cls: "text-text-muted" },
  HALF_LOST: { label: "เสียครึ่ง", cls: "text-danger" },
  LOST: { label: "แพ้", cls: "text-danger" },
  VOID: { label: "ยกเลิก", cls: "text-text-muted" },
};

export default async function HistoryPage() {
  const settled = await prisma.pick.findMany({
    where: { result: { not: "PENDING" } },
    include: { fixture: { include: { homeTeam: true, awayTeam: true } } },
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
  });

  const wins = settled.filter((p) => p.result === "WON" || p.result === "HALF_WON").length;
  const winRate = settled.length ? (wins / settled.length) * 100 : 0;

  const chartPoints = settled.reduce<Array<{ label: string; cumulativeUnits: number }>>((acc, p) => {
    const previous = acc.length > 0 ? acc[acc.length - 1].cumulativeUnits : 0;
    acc.push({ label: formatMatchDate(p.date), cumulativeUnits: previous + (p.profitLossUnits ?? 0) });
    return acc;
  }, []);
  const running = chartPoints.length > 0 ? chartPoints[chartPoints.length - 1].cumulativeUnits : 0;

  const recent = settled.slice().reverse();

  return (
    <div className="flex flex-1 flex-col px-4 pt-[calc(1.25rem+env(safe-area-inset-top))]">
      <header className="mb-4">
        <h1 className="text-2xl font-bold text-text-primary">สถิติย้อนหลัง</h1>
        <p className="mt-1 text-sm text-text-secondary">ผลจริงของบิลที่แนะนำไป (ลงเท่ากันทุกบิล 1 หน่วย) เพื่อความโปร่งใส</p>
      </header>

      {settled.length === 0 ? (
        <p className="mt-8 text-center text-sm text-text-muted">ยังไม่มีบิลที่ตัดสินผลแล้ว</p>
      ) : (
        <>
          <section className="grid grid-cols-3 gap-2">
            <StatTile label="บิลทั้งหมด" value={String(settled.length)} />
            <StatTile label="อัตราถูก" value={`${winRate.toFixed(0)}%`} />
            <StatTile label="กำไรสะสม" value={`${running >= 0 ? "+" : ""}${running.toFixed(2)}u`} />
          </section>

          <section className="mt-4 rounded-2xl border border-border-subtle bg-surface p-4">
            <PnlChart points={chartPoints} />
          </section>

          <section className="mt-4 flex flex-col gap-2 pb-4">
            {recent.map((p) => {
              const style = RESULT_STYLE[p.result] ?? RESULT_STYLE.VOID;
              const units = p.profitLossUnits ?? 0;
              return (
                <div key={p.id} className="rounded-xl border border-border-subtle bg-surface p-3">
                  <div className="flex items-center justify-between text-[11px] text-text-muted">
                    <span>{formatMatchDate(p.date)} · {p.fixture.league}</span>
                    <span className={style.cls}>{style.label}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <p className="min-w-0 truncate text-sm text-text-primary">
                      {betLabel(p.market, p.side, p.line, p.fixture.homeTeam.name, p.fixture.awayTeam.name)}
                      <span className="ml-1 font-mono text-xs text-text-muted">@{p.odds.toFixed(2)}</span>
                    </p>
                    <span className={`shrink-0 font-mono text-sm font-medium ${units >= 0 ? "text-accent" : "text-danger"}`}>
                      {units >= 0 ? "+" : ""}
                      {units.toFixed(2)}u
                    </span>
                  </div>
                </div>
              );
            })}
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
