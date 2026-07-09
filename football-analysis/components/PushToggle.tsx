"use client";

import { useEffect, useState } from "react";
import { urlBase64ToUint8Array } from "@/lib/pushClient";

type Status = "checking" | "unsupported" | "off" | "on" | "denied";

async function checkStatus(): Promise<Status> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
    return "unsupported";
  }
  if (Notification.permission === "denied") return "denied";
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  return subscription ? "on" : "off";
}

export default function PushToggle() {
  const [status, setStatus] = useState<Status>("checking");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void checkStatus().then(setStatus);
  }, []);

  async function enable() {
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus("denied");
        return;
      }

      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!publicKey) {
        console.error("NEXT_PUBLIC_VAPID_PUBLIC_KEY is not set");
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
      });

      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });
      setStatus("on");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        await subscription.unsubscribe();
      }
      setStatus("off");
    } finally {
      setBusy(false);
    }
  }

  if (status === "unsupported") {
    return <p className="text-xs text-text-muted">เบราว์เซอร์นี้ไม่รองรับการแจ้งเตือนแบบพุช</p>;
  }
  if (status === "denied") {
    return <p className="text-xs text-danger">การแจ้งเตือนถูกบล็อกไว้ — เปิดใช้งานได้ในการตั้งค่าเบราว์เซอร์</p>;
  }

  return (
    <button
      onClick={() => (status === "on" ? disable() : enable())}
      disabled={busy || status === "checking"}
      className={`flex w-full items-center justify-between rounded-xl border border-border-subtle p-3 text-left transition ${
        status === "on" ? "bg-accent-soft" : "bg-surface"
      }`}
    >
      <span className="text-sm text-text-primary">แจ้งเตือน Step 5 ทุกเช้า</span>
      <span
        className={`relative h-6 w-10 shrink-0 rounded-full transition-colors ${status === "on" ? "bg-accent" : "bg-surface-2"}`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
            status === "on" ? "translate-x-[18px]" : "translate-x-0.5"
          }`}
        />
      </span>
    </button>
  );
}
