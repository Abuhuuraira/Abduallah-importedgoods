import "server-only";

import crypto from "node:crypto";
import webpush from "web-push";
import { getSiteUrl } from "@/lib/site";
import { getPublicSupabase } from "@/lib/supabase/public";

/*
 * Web Push notifications to the admin's phones/computers.
 *
 * Needs ONE server-only environment variable: VAPID_PRIVATE_KEY.
 * The matching public key is derived from it, and so is a "push secret"
 * that lets this server (and nobody else) ask the database which admin
 * devices should be notified. The database only stores a SHA-256
 * fingerprint of that secret (saved when an admin turns notifications on).
 */

export type PushKind = "order" | "like" | "test";

export type PushPayload = {
  title: string;
  body: string;
  /** Admin page to open when the notification is tapped, e.g. /admin/orders/… */
  url: string;
  /** Notifications with the same tag replace each other on the device. */
  tag?: string;
};

type Vapid = { publicKey: string; privateKey: string; secret: string; secretHash: string };

let cached: Vapid | null | undefined;

export function getVapid(): Vapid | null {
  if (cached !== undefined) return cached;
  const privateKey = (process.env.VAPID_PRIVATE_KEY ?? "").trim();
  if (!privateKey) return (cached = null);
  try {
    const raw = Buffer.from(privateKey, "base64url");
    if (raw.length !== 32) throw new Error("expected a 32-byte base64url key");
    const ecdh = crypto.createECDH("prime256v1");
    ecdh.setPrivateKey(raw);
    const publicKey = ecdh.getPublicKey().toString("base64url");
    const secret = crypto.createHmac("sha256", raw).update("aig-push-targets-v1").digest("hex");
    const secretHash = crypto.createHash("sha256").update(secret).digest("hex");
    return (cached = { publicKey, privateKey: raw.toString("base64url"), secret, secretHash });
  } catch (error) {
    console.error("[push] VAPID_PRIVATE_KEY is not valid:", (error as Error).message);
    return (cached = null);
  }
}

/** Public key the browser needs to subscribe, or null when push is not set up. */
export function getVapidPublicKey(): string | null {
  return getVapid()?.publicKey ?? null;
}

/** Contact for push services: must be an https: URL or mailto: address. */
function vapidSubject(): string {
  const explicit = process.env.VAPID_SUBJECT?.trim();
  if (explicit && /^(mailto:|https:\/\/)/.test(explicit)) return explicit;
  const site = getSiteUrl();
  // The live site is https; a local http://localhost address is not accepted.
  return site.startsWith("https://") ? site : "mailto:webpush@example.com";
}

export type PushResult = { configured: boolean; sent: number; failed: number };

/**
 * Sends a notification to every admin device that wants this kind of alert
 * (or only to `onlyEndpoint`). Never throws.
 */
export async function sendAdminPush(kind: PushKind, payload: PushPayload, onlyEndpoint?: string): Promise<PushResult> {
  const vapid = getVapid();
  const supabase = getPublicSupabase();
  if (!vapid || !supabase) return { configured: false, sent: 0, failed: 0 };

  const { data, error } = await supabase.rpc("get_push_targets", {
    p_secret: vapid.secret,
    p_kind: kind,
    p_endpoint: onlyEndpoint ?? null,
  });
  if (error) {
    console.error("[push] Could not load admin devices:", error.code, error.message);
    return { configured: true, sent: 0, failed: 0 };
  }

  const body = JSON.stringify(payload);
  const result: PushResult = { configured: true, sent: 0, failed: 0 };

  await Promise.all(
    (data ?? []).map(async (target) => {
      try {
        await webpush.sendNotification(
          { endpoint: target.endpoint, keys: { p256dh: target.p256dh, auth: target.auth } },
          body,
          {
            vapidDetails: { subject: vapidSubject(), publicKey: vapid.publicKey, privateKey: vapid.privateKey },
            TTL: 24 * 60 * 60,
            urgency: kind === "like" ? "normal" : "high",
            timeout: 10_000,
          },
        );
        result.sent++;
      } catch (error) {
        result.failed++;
        const status = (error as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          // The device unsubscribed or the subscription expired — forget it.
          await supabase.rpc("remove_push_target", { p_secret: vapid.secret, p_endpoint: target.endpoint });
        } else {
          console.error("[push] Sending failed:", status ?? "", (error as Error).message);
        }
      }
    }),
  );
  return result;
}
