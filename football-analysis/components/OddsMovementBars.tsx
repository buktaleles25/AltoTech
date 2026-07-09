type Snapshot = { impliedHomeProb: number; impliedDrawProb: number | null; impliedAwayProb: number };

const OUTCOMES: Array<{ key: "impliedHomeProb" | "impliedDrawProb" | "impliedAwayProb"; label: string }> = [
  { key: "impliedHomeProb", label: "เจ้าบ้าน" },
  { key: "impliedDrawProb", label: "เสมอ" },
  { key: "impliedAwayProb", label: "ทีมเยือน" },
];

export default function OddsMovementBars({ opening, current }: { opening: Snapshot; current: Snapshot }) {
  return (
    <div className="rounded-xl border border-border-subtle bg-surface p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-medium text-text-primary">การขยับของราคาน้ำ (Implied Probability)</p>
        <Legend />
      </div>
      <div className="flex flex-col gap-3">
        {OUTCOMES.map((outcome) => {
          const openVal = opening[outcome.key];
          const curVal = current[outcome.key];
          if (openVal == null || curVal == null) return null;
          const delta = curVal - openVal;
          const steamed = Math.abs(delta) >= 0.03;

          return (
            <div key={outcome.key}>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="text-text-secondary">{outcome.label}</span>
                <span className={`font-mono ${steamed ? "font-semibold text-warning" : "text-text-muted"}`}>
                  {(openVal * 100).toFixed(0)}% → {(curVal * 100).toFixed(0)}%
                  {steamed && ` (${delta > 0 ? "+" : ""}${(delta * 100).toFixed(1)}pt)`}
                </span>
              </div>
              <div className="relative h-2 w-full overflow-hidden rounded-full bg-surface-2">
                <div className="absolute inset-y-0 left-0 rounded-full bg-text-muted/50" style={{ width: `${openVal * 100}%` }} />
                <div
                  className={`absolute inset-y-0 left-0 rounded-full ${steamed ? "bg-warning" : "bg-accent"}`}
                  style={{ width: `${curVal * 100}%`, opacity: 0.85, mixBlendMode: "screen" }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Legend() {
  return (
    <div className="flex items-center gap-3 text-[10px] text-text-muted">
      <span className="flex items-center gap-1">
        <span className="h-2 w-2 rounded-full bg-text-muted/50" /> เปิด
      </span>
      <span className="flex items-center gap-1">
        <span className="h-2 w-2 rounded-full bg-accent" /> ล่าสุด
      </span>
    </div>
  );
}
