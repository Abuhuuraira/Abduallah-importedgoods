"use server";

import { getAdminForAction } from "@/lib/auth";
import { getVapid, sendAdminPush } from "@/lib/push";
import type { ActionResult } from "@/types";
import { UNAUTHORIZED } from "./helpers";

type SubscriptionJson = { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } };

const NOT_CONFIGURED: ActionResult<never> = {
  ok: false,
  code: "NOT_CONFIGURED",
  error: "Phone notifications are not set up on the server yet (VAPID_PRIVATE_KEY is missing).",
};

function validSubscription(sub: SubscriptionJson) {
  const endpoint = typeof sub?.endpoint === "string" ? sub.endpoint : "";
  const p256dh = typeof sub?.keys?.p256dh === "string" ? sub.keys.p256dh : "";
  const auth = typeof sub?.keys?.auth === "string" ? sub.keys.auth : "";
  let https = false;
  try {
    https = new URL(endpoint).protocol === "https:";
  } catch {
    https = false;
  }
  if (!https || endpoint.length > 1000 || !/^[A-Za-z0-9_=-]{20,200}$/.test(p256dh) || !/^[A-Za-z0-9_=-]{8,100}$/.test(auth)) {
    return null;
  }
  return { endpoint, p256dh, auth };
}

/** Saves this device so it receives order/like notifications. */
export async function savePushDeviceAction(subscription: SubscriptionJson, deviceLabel: string): Promise<ActionResult> {
  const admin = await getAdminForAction();
  if (!admin) return UNAUTHORIZED;
  const vapid = getVapid();
  if (!vapid) return NOT_CONFIGURED;
  const sub = validSubscription(subscription);
  if (!sub) return { ok: false, error: "This browser returned an invalid notification subscription." };

  const { error } = await admin.supabase.rpc("admin_save_push_subscription", {
    p_endpoint: sub.endpoint,
    p_p256dh: sub.p256dh,
    p_auth: sub.auth,
    p_device_label: String(deviceLabel ?? "").slice(0, 120),
    p_secret_hash: vapid.secretHash,
  });
  if (error) {
    console.error("[push] save device failed:", error.code, error.message);
    return { ok: false, error: "Could not turn on notifications. Make sure all SQL files were run in Supabase." };
  }
  return { ok: true, message: "Notifications are on for this device." };
}

export async function updatePushDeviceAction(endpoint: string, notifyOrders: boolean, notifyLikes: boolean): Promise<ActionResult> {
  const admin = await getAdminForAction();
  if (!admin) return UNAUTHORIZED;
  if (typeof endpoint !== "string" || typeof notifyOrders !== "boolean" || typeof notifyLikes !== "boolean") {
    return { ok: false, error: "Invalid request." };
  }
  const { error } = await admin.supabase.rpc("admin_update_push_device", {
    p_endpoint: endpoint,
    p_notify_orders: notifyOrders,
    p_notify_likes: notifyLikes,
  });
  if (error) return { ok: false, error: "Could not save your choice. Please try again." };
  return { ok: true, message: "Saved." };
}

export async function deletePushDeviceAction(endpoint: string): Promise<ActionResult> {
  const admin = await getAdminForAction();
  if (!admin) return UNAUTHORIZED;
  if (typeof endpoint !== "string") return { ok: false, error: "Invalid request." };
  const { error } = await admin.supabase.rpc("admin_delete_push_device", { p_endpoint: endpoint });
  if (error) return { ok: false, error: "Could not turn off notifications. Please try again." };
  return { ok: true, message: "Notifications are off for this device." };
}

export async function sendTestPushAction(endpoint: string): Promise<ActionResult> {
  const admin = await getAdminForAction();
  if (!admin) return UNAUTHORIZED;
  if (!getVapid()) return NOT_CONFIGURED;
  if (typeof endpoint !== "string" || !endpoint) return { ok: false, error: "Invalid request." };

  const result = await sendAdminPush(
    "test",
    {
      title: "Notifications are working ✅",
      body: "You will get an alert like this for every new order.",
      url: "/admin/orders",
      tag: "test",
    },
    endpoint,
  );
  if (result.sent > 0) return { ok: true, message: "Test notification sent. It should appear in a few seconds." };
  return {
    ok: false,
    error: "The test notification could not be delivered. Turn notifications off and on again on this device.",
  };
}
