import Link from "next/link";
import ConfidenceBadge from "./ConfidenceBadge";
import { betLabel, formatEdge, formatKickoff, formatMatchDate, formatOdds, marketTag } from "@/lib/format";

export type PickCardData = {
  id: string;
  market: string;
  side: string;
  line: number | null;
  odds: number;
  bookmaker: string;
  modelProb: number;
  fairProb: number;
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

export default function PickCard({ pick }: { pick: PickCardData }) {
  const label = betLabel(pick.market, pick.side, pick.line, pick.fixture.homeTeam.name, pick.fixture.awayTeam.name);

  return (
    <Link
      href={`/fixtures/${pick.fixture.id}`}
      className="block rounded-2xl border border-border-subtle bg-surface p-4 transition active:scale-[0.99]"
    >
      <div className="flex items-center justify-between text-[11px] text-text-muted">
        <span className="flex items-center gap-1.5">
          <span className="rounded bg-surface-2 px-1.5 py-0.5 font-medium text-text-secondary">{marketTag(pick.market)}</span>
          {pick.fixture.league}
        </span>
        <span>{formatMatchDate(pick.fixture.kickoffAt)} · {formatKickoff(pick.fixture.kickoffAt)}</span>
      </div>

      <p className="mt-2 truncate text-xs text-text-secondary">
        {pick.fixture.homeTeam.name} <span className="text-text-muted">vs</span> {pick.fixture.awayTeam.name}
      </p>

      <div className="mt-2 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-base font-semibold text-text-primary">{label}</p>
          <p className="mt-0.5 text-[11px] text-text-muted">
            ที่ {pick.bookmaker} · โมเดลให้โอกาส {(pick.modelProb * 100).toFixed(0)}%
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[10px] text-text-muted">ราคาน้ำ</p>
          <p className="font-mono text-2xl font-bold text-accent">{formatOdds(pick.odds)}</p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <ConfidenceBadge confidence={pick.confidence} />
        <span className={`font-mono text-xs font-medium ${pick.edge >= 0 ? "text-accent" : "text-danger"}`}>
          EV {formatEdge(pick.edge)}
        </span>
      </div>
    </Link>
  );
}
