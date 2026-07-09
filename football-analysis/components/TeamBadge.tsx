import { teamInitials } from "@/lib/format";

export default function TeamBadge({ name, size = 36 }: { name: string; size?: number }) {
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full bg-surface-2 font-semibold text-text-secondary ring-1 ring-border-subtle"
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {teamInitials(name)}
    </div>
  );
}
