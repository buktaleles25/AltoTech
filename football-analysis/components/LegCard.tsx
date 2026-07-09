import Link from "next/link";
import TeamBadge from "./TeamBadge";
import ConfidenceBadge from "./ConfidenceBadge";
import { formatEdge, formatKickoff, formatOdds, selectionLabel } from "@/lib/format";
import { LOW_CONFIDENCE_FILL_MARKER } from "@/lib/constants";

export type LegCardData = {
  id: string;
  selection: string;
  odds: number;
  edge: number;
  confidence: number;
  reasoning: string | null;
  fixture: {
    id: string;
    league: string;
    kickoffAt: Date | string;
    homeTeam: { name: string };
    awayTeam: { name: string };
  };
};

export default function LegCard({ leg, index }: { leg: LegCardData; index?: number }) {
  const isLowConfidenceFill = leg.reasoning?.includes(LOW_CONFIDENCE_FILL_MARKER) ?? false;

  return (
    <Link
      href={`/fixtures/${leg.fixture.id}`}
      className="block rounded-2xl border border-border-subtle bg-surface p-4 transition active:scale-[0.99]"
    >
      <div className="flex items-center justify-between text-[11px] text-text-muted">
        <span>
          {typeof index === "number" ? `ขา ${index + 1} · ` : ""}
          {leg.fixture.league}
        </span>
        <span>{formatKickoff(leg.fixture.kickoffAt)}</span>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-2 min-w-0">
          <TeamBadge name={leg.fixture.homeTeam.name} size={32} />
          <div className="min-w-0 text-sm">
            <p className="truncate text-text-primary">{leg.fixture.homeTeam.name}</p>
            <p className="truncate text-text-muted">{leg.fixture.awayTeam.name}</p>
          </div>
        </div>

        <div className="shrink-0 text-right">
          <p className="text-xs font-medium text-accent">{selectionLabel(leg.selection)}</p>
          <p className="font-mono text-lg font-semibold text-text-primary">{formatOdds(leg.odds)}</p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <ConfidenceBadge confidence={leg.confidence} />
        <span className={`font-mono text-xs font-medium ${leg.edge >= 0 ? "text-accent" : "text-danger"}`}>
          edge {formatEdge(leg.edge)}
        </span>
      </div>

      {leg.reasoning && (
        <p className="mt-2 text-[11px] leading-relaxed text-text-secondary">
          {isLowConfidenceFill && <span className="font-medium text-warning">⚠ ตัวเลือกสำรอง (ยังไม่ถึงเกณฑ์คุณค่า) · </span>}
          {leg.reasoning.replace(` ${LOW_CONFIDENCE_FILL_MARKER}`, "")}
        </p>
      )}
    </Link>
  );
}
