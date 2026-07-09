import { CONFIDENCE_TIER_STYLES, confidenceTier } from "@/lib/format";

export default function ConfidenceBadge({ confidence }: { confidence: number }) {
  const tier = confidenceTier(confidence);
  const style = CONFIDENCE_TIER_STYLES[tier];

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${style.bg} ${style.text} ${style.ring}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {confidence}% · {style.label}
    </span>
  );
}
