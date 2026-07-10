import { CONFIDENCE_TIER_STYLES, confidenceTier } from "@/lib/format";

/** Confidence meter: severity-colored fill on a soft track of the same hue, with % + tier label. */
export default function ConfidenceBadge({ confidence }: { confidence: number }) {
  const tier = confidenceTier(confidence);
  const style = CONFIDENCE_TIER_STYLES[tier];
  const width = Math.max(0, Math.min(100, confidence));

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`relative h-1.5 w-12 overflow-hidden rounded-full ${style.bg}`}>
        <span className={`absolute inset-y-0 left-0 rounded-full ${style.bar}`} style={{ width: `${width}%` }} />
      </span>
      <span className={`whitespace-nowrap text-[11px] font-semibold ${style.text}`}>{confidence}%</span>
      <span className="whitespace-nowrap text-[11px] text-text-muted">{style.label}</span>
    </span>
  );
}
