import Link from "next/link";
import ConfidenceBadge from "./ConfidenceBadge";
import { suggestedStakeUnits } from "@/lib/analysis/staking";
import {
  betLabel,
  formatEdge,
  formatKickoff,
  formatMatchDate,
  formatOdds,
  formatUnits,
  kickoffCountdown,
  marketChipClass,
  marketTag,
} from "@/lib/format";

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

export default function PickCard({ pick, extraCount = 0 }: { pick: PickCardData; extraCount?: number }) {
  const label = betLabel(pick.market, pick.side, pick.line, pick.fixture.homeTeam.name, pick.fixture.awayTeam.name);
  const stake = suggestedStakeUnits(pick.modelProb, pick.odds);
  const countdown = kickoffCountdown(pick.fixture.kickoffAt);

  return (
    <Link
      href={`/fixtures/${pick.fixture.id}`}
      className="card-elevated block rounded-2xl p-4 transition active:scale-[0.99]"
    >
      <div className="flex items-center justify-between gap-2 text-[11px]">
        <span className="flex min-w-0 items-center gap-1.5">
          <span className={`shrink-0 rounded-md px-1.5 py-0.5 font-semibold ${marketChipClass(pick.market)}`}>
            {marketTag(pick.market)}
          </span>
          <span className="truncate text-text-muted">{pick.fixture.league}</span>
        </span>
        <span className="shrink-0 text-text-muted">
          {countdown ? (
            <span className="font-medium text-warning">{countdown}</span>
          ) : (
            formatMatchDate(pick.fixture.kickoffAt)
          )}
          {" · "}
          {formatKickoff(pick.fixture.kickoffAt)}
        </span>
      </div>

      <p className="mt-2.5 truncate text-[13px]">
        <span className="font-medium text-text-primary">{pick.fixture.homeTeam.name}</span>
        <span className="text-text-muted"> vs </span>
        <span className="font-medium text-text-primary">{pick.fixture.awayTeam.name}</span>
      </p>

      <div className="mt-1 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-lg font-bold leading-snug text-text-primary">{label}</p>
          <p className="mt-0.5 text-[11px] text-text-muted">
            ที่ {pick.bookmaker} · โมเดลให้โอกาส {(pick.modelProb * 100).toFixed(0)}%
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-mono text-[28px] font-bold leading-none text-accent">{formatOdds(pick.odds)}</p>
          <p className="mt-1 text-[10px] text-text-muted">ราคาน้ำ</p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-border-subtle pt-2.5">
        <ConfidenceBadge confidence={pick.confidence} />
        <div className="flex shrink-0 items-center gap-1.5">
          {extraCount > 0 && (
            <span className="rounded-md bg-surface-2 px-1.5 py-0.5 text-[11px] font-medium text-text-secondary">
              +{extraCount} ตัวเลือก
            </span>
          )}
          <span
            className={`rounded-md px-1.5 py-0.5 font-mono text-[11px] font-medium ${
              pick.edge >= 0 ? "bg-surface-2 text-text-secondary" : "bg-danger-soft text-danger"
            }`}
          >
            EV {formatEdge(pick.edge)}
          </span>
          {stake > 0 && (
            <span className="rounded-md bg-accent-soft px-1.5 py-0.5 font-mono text-[11px] font-semibold text-accent">
              แทง {formatUnits(stake)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
