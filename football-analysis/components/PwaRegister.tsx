"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export default function PwaRegister() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch((err) => console.error("SW registration failed:", err));
    }

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  if (!installEvent || dismissed) return null;

  return (
    <div className="fixed inset-x-0 bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-40 mx-auto flex w-full max-w-md items-center gap-3 rounded-2xl border border-border-subtle bg-surface-2 px-4 py-3 shadow-lg shadow-black/40 sm:bottom-6">
      <div className="flex-1 text-sm">
        <p className="font-medium text-text-primary">ติดตั้งแอป Step 5</p>
        <p className="text-text-secondary">เพิ่มไปยังหน้าจอหลักเพื่อเปิดใช้งานได้เร็วขึ้นและรับการแจ้งเตือน</p>
      </div>
      <button
        onClick={async () => {
          await installEvent.prompt();
          setInstallEvent(null);
        }}
        className="shrink-0 rounded-full bg-accent-strong px-4 py-2 text-sm font-semibold text-white"
      >
        ติดตั้ง
      </button>
      <button
        onClick={() => setDismissed(true)}
        aria-label="ปิด"
        className="shrink-0 text-text-muted"
      >
        ✕
      </button>
    </div>
  );
}
