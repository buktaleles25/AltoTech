import { formatMatchDate, selectionLabel } from "@/lib/format";

export type StepHistoryData = {
  id: string;
  date: Date | string;
  combinedOdds: number;
  resultOutcome: string;
  legs: Array<{
    id: string;
    selection: string;
    legResult: string;
    fixture: { homeTeam: { name: string }; awayTeam: { name: string } };
  }>;
  result: { profitLossUnits: number } | null;
};

const OUTCOME_STYLES: Record<string, { label: string; text: string; bg: string }> = {
  WIN: { label: "ถูก", text: "text-accent", bg: "bg-accent-soft" },
  LOSE: { label: "พลาด", text: "text-danger", bg: "bg-danger-soft" },
  VOID: { label: "ยกเลิก", text: "text-text-muted", bg: "bg-surface-2" },
};

export default function StepHistoryCard({ step }: { step: StepHistoryData }) {
  const style = OUTCOME_STYLES[step.resultOutcome] ?? OUTCOME_STYLES.VOID;
  const units = step.result?.profitLossUnits ?? 0;

  return (
    <div className="rounded-2xl border border-border-subtle bg-surface p-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm text-text-secondary">{formatMatchDate(step.date)}</p>
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${style.bg} ${style.text}`}>{style.label}</span>
      </div>

      <div className="flex items-center justify-between">
        <p className="font-mono text-lg font-semibold text-text-primary">{step.combinedOdds.toFixed(2)}</p>
        <p className={`font-mono text-sm font-medium ${units >= 0 ? "text-accent" : "text-danger"}`}>
          {units >= 0 ? "+" : ""}
          {units.toFixed(2)}u
        </p>
      </div>

      <ul className="mt-3 flex flex-col gap-1 border-t border-border-subtle pt-2">
        {step.legs.map((leg) => (
          <li key={leg.id} className="flex items-center justify-between text-[11px]">
            <span className="truncate text-text-secondary">
              {leg.fixture.homeTeam.name} vs {leg.fixture.awayTeam.name} · {selectionLabel(leg.selection)}
            </span>
            <span className={leg.legResult === "WON" ? "text-accent" : leg.legResult === "LOST" ? "text-danger" : "text-text-muted"}>
              {leg.legResult === "WON" ? "✓" : leg.legResult === "LOST" ? "✕" : "–"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
