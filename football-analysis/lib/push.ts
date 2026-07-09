import webpush from "web-push";
import { prisma } from "@/lib/db";

let configured = false;

function ensureConfigured() {
  if (configured) return true;
  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env;
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return false;
  webpush.setVapidDetails(VAPID_SUBJECT || "mailto:you@example.com", VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  configured = true;
  return true;
}

/** Sends a push notification to every subscribed browser. Prunes subscriptions the browser has revoked. */
export async function broadcastPush(payload: { title: string; body: string; url?: string }): Promise<{ sent: number; pruned: number }> {
  if (!ensureConfigured()) {
    console.warn("Push not configured (missing VAPID keys) — skipping broadcast.");
    return { sent: 0, pruned: 0 };
  }

  const subscriptions = await prisma.pushSubscription.findMany();
  let sent = 0;
  let pruned = 0;

  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload),
      );
      sent += 1;
    } catch (err: unknown) {
      const statusCode = (err as { statusCode?: number }).statusCode;
      if (statusCode === 404 || statusCode === 410) {
        await prisma.pushSubscription.delete({ where: { id: sub.id } });
        pruned += 1;
      } else {
        console.error("Push send failed:", err);
      }
    }
  }

  return { sent, pruned };
}
