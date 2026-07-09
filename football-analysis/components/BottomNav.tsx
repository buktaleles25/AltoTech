"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "วันนี้", icon: TodayIcon },
  { href: "/fixtures", label: "ตารางแข่ง", icon: FixturesIcon },
  { href: "/history", label: "สถิติ", icon: HistoryIcon },
  { href: "/settings", label: "ตั้งค่า", icon: SettingsIcon },
] as const;

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border-subtle bg-surface/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-md items-stretch justify-around pb-[env(safe-area-inset-bottom)]">
        {NAV_ITEMS.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium"
            >
              <Icon active={active} />
              <span className={active ? "text-accent" : "text-text-muted"}>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function TodayIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className={active ? "stroke-accent" : "stroke-text-muted"}>
      <path d="M12 3l8 6v11a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1V9l8-6z" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

function FixturesIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className={active ? "stroke-accent" : "stroke-text-muted"}>
      <rect x="4" y="5" width="16" height="15" rx="2" strokeWidth="1.8" />
      <path d="M4 9.5h16M8 3v3M16 3v3" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function HistoryIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className={active ? "stroke-accent" : "stroke-text-muted"}>
      <path d="M4 20V12M11 20V6M18 20V9" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function SettingsIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className={active ? "stroke-accent" : "stroke-text-muted"}>
      <circle cx="12" cy="12" r="3" strokeWidth="1.8" />
      <path
        d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1-1.56 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.56-1 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34H9a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87V9c.26.63.82 1.06 1.55 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.51 1z"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}
