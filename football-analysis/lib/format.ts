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

export function formatEdge(edge: number): string {
  const pct = (edge * 100).toFixed(1);
  return `${edge >= 0 ? "+" : ""}${pct}%`;
}

export function formatKickoff(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
}

export function formatMatchDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString("th-TH", { weekday: "short", day: "numeric", month: "short" });
}

export type ConfidenceTier = "high" | "medium" | "low";

export function confidenceTier(confidence: number): ConfidenceTier {
  if (confidence >= 75) return "high";
  if (confidence >= 50) return "medium";
  return "low";
}

export const CONFIDENCE_TIER_STYLES: Record<ConfidenceTier, { label: string; text: string; bg: string; ring: string }> = {
  high: { label: "มั่นใจสูง", text: "text-accent", bg: "bg-accent-soft", ring: "ring-accent/40" },
  medium: { label: "มั่นใจปานกลาง", text: "text-warning", bg: "bg-warning-soft", ring: "ring-warning/40" },
  low: { label: "มั่นใจต่ำ", text: "text-danger", bg: "bg-danger-soft", ring: "ring-danger/40" },
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
