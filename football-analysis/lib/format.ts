export function selectionLabel(selection: string): string {
  switch (selection) {
    case "HOME":
      return "เจ้าบ้านชนะ";
    case "AWAY":
      return "ทีมเยือนชนะ";
    case "DRAW":
      return "เสมอ";
    default:
      return selection;
  }
}

export function shortSelectionLabel(selection: string): string {
  switch (selection) {
    case "HOME":
      return "1";
    case "AWAY":
      return "2";
    case "DRAW":
      return "X";
    default:
      return selection;
  }
}

export function formatOdds(odds: number): string {
  return odds.toFixed(2);
}

function fmtNum(n: number): string {
  return Number.isInteger(n) ? String(n) : String(n);
}

/**
 * Formats an absolute handicap/total magnitude the Thai way, splitting quarter lines into their
 * two component lines (e.g. 0.25 → "0/0.5", 0.75 → "0.5/1", 2.25 → "2/2.5").
 */
export function formatLineMagnitude(mag: number): string {
  const isQuarter = Math.round(mag * 4) % 2 !== 0;
  if (!isQuarter) return fmtNum(mag);
  return `${fmtNum(mag - 0.25)}/${fmtNum(mag + 0.25)}`;
}

/**
 * Human-readable Thai bet label for a recommended pick.
 * - AH: "ฝรั่งเศส ต่อ 0.5" (favourite) / "โมร็อกโก รอง 0.5" (underdog) / "… เสมอ" (level line)
 * - OU: "สูง 2.5" / "ต่ำ 2.5"
 * - H2H: "ฝรั่งเศส ชนะ" / "เสมอ"
 */
export function betLabel(
  market: string,
  side: string,
  line: number | null,
  homeName: string,
  awayName: string,
): string {
  if (market === "OU") {
    return `${side === "OVER" ? "สูง" : "ต่ำ"} ${formatLineMagnitude(line as number)}`;
  }
  if (market === "AH") {
    const teamName = side === "HOME" ? homeName : awayName;
    const sideLine = side === "HOME" ? (line as number) : -(line as number);
    if (Math.abs(sideLine) < 1e-9) return `${teamName} เสมอ`;
    const kind = sideLine < 0 ? "ต่อ" : "รอง";
    return `${teamName} ${kind} ${formatLineMagnitude(Math.abs(sideLine))}`;
  }
  // H2H
  if (side === "DRAW") return "เสมอ";
  return `${side === "HOME" ? homeName : awayName} ชนะ`;
}

/** Short market tag for chips/badges. */
export function marketTag(market: string): string {
  if (market === "AH") return "แฮนดิแคป";
  if (market === "OU") return "สูง/ต่ำ";
  return "1X2";
}

/**
 * Chip styling per market — identity color validated against the dark surface; the Thai label
 * (marketTag) always rides along, so color never carries identity alone.
 */
export function marketChipClass(market: string): string {
  if (market === "AH") return "bg-market-ah-soft text-market-ah";
  if (market === "OU") return "bg-market-ou-soft text-market-ou";
  return "bg-surface-2 text-text-secondary";
}

/** "1.25u" / "1u" — suggested stake in flat units. */
export function formatUnits(units: number): string {
  const s = Number.isInteger(units) ? String(units) : units.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
  return `${s}u`;
}

/**
 * Thai countdown to kickoff for same-day urgency: "อีก 45 นาที" under an hour, "อีก 3 ชม." under a
 * day, null beyond that (the date label carries it), "เตะแล้ว" once started.
 */
export function kickoffCountdown(date: Date | string, now: Date = new Date()): string | null {
  const diffMin = Math.round((new Date(date).getTime() - now.getTime()) / 60000);
  if (diffMin <= 0) return "เตะแล้ว";
  if (diffMin < 60) return `อีก ${diffMin} นาที`;
  if (diffMin < 24 * 60) return `อีก ${Math.round(diffMin / 60)} ชม.`;
  return null;
}

export function formatEdge(edge: number): string {
  const pct = (edge * 100).toFixed(1);
  return `${edge >= 0 ? "+" : ""}${pct}%`;
}

// Servers run UTC but the audience is Thai — pin every displayed time to Asia/Bangkok, or
// kickoff times render 7 hours early.
export function formatKickoff(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok" });
}

export function formatMatchDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString("th-TH", { weekday: "short", day: "numeric", month: "short", timeZone: "Asia/Bangkok" });
}

export type ConfidenceTier = "high" | "medium" | "low";

export function confidenceTier(confidence: number): ConfidenceTier {
  if (confidence >= 75) return "high";
  if (confidence >= 50) return "medium";
  return "low";
}

export const CONFIDENCE_TIER_STYLES: Record<
  ConfidenceTier,
  { label: string; text: string; bg: string; ring: string; bar: string }
> = {
  high: { label: "มั่นใจสูง", text: "text-accent", bg: "bg-accent-soft", ring: "ring-accent/40", bar: "bg-accent" },
  medium: { label: "มั่นใจปานกลาง", text: "text-warning", bg: "bg-warning-soft", ring: "ring-warning/40", bar: "bg-warning" },
  low: { label: "มั่นใจต่ำ", text: "text-danger", bg: "bg-danger-soft", ring: "ring-danger/40", bar: "bg-danger" },
};

export function teamInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
