"use server";

import { refresh } from "next/cache";
import { getAdminForAction } from "@/lib/auth";
import { formatOrderNumber, isOrderStatus, ORDER_STATUS_LABELS } from "@/lib/orders";
import { idSchema } from "@/lib/validation";
import type { ActionResult } from "@/types";
import { UNAUTHORIZED } from "./helpers";

export async function setOrderStatusAction(
  id: string,
  from: string,
  to: string,
  orderNumber?: number,
): Promise<ActionResult> {
  const admin = await getAdminForAction();
  if (!admin) return UNAUTHORIZED;
  if (!idSchema.safeParse(id).success || !isOrderStatus(from) || !isOrderStatus(to)) {
    return { ok: false, error: "Invalid request." };
  }

  const { error } = await admin.supabase.rpc("admin_set_order_status", { p_id: id, p_from: from, p_to: to });
  refresh();
  if (error) {
    if (error.message === "ORDER_CHANGED") {
      return { ok: false, code: "CONFLICT", error: "This order was already updated (maybe by another admin). The page has been refreshed." };
    }
    if (error.message === "ORDER_NOT_FOUND") return { ok: false, code: "NOT_FOUND", error: "This order no longer exists." };
    console.error("[orders] status change failed:", error.code, error.message);
    return { ok: false, error: "Could not update the order. Please try again." };
  }
  const label = orderNumber ? `${formatOrderNumber(orderNumber)} ` : "Order ";
  return { ok: true, message: `${label}is now ${ORDER_STATUS_LABELS[to].toLowerCase()}.` };
}

export async function saveOrderNoteAction(id: string, note: string): Promise<ActionResult> {
  const admin = await getAdminForAction();
  if (!admin) return UNAUTHORIZED;
  if (!idSchema.safeParse(id).success || typeof note !== "string") return { ok: false, error: "Invalid request." };
  if (note.trim().length > 1000) return { ok: false, error: "The note can be at most 1000 characters." };

  const { error } = await admin.supabase.rpc("admin_set_order_note", { p_id: id, p_note: note });
  if (error) {
    console.error("[orders] note save failed:", error.code, error.message);
    return { ok: false, error: error.message === "ORDER_NOT_FOUND" ? "This order no longer exists." : "Could not save the note." };
  }
  refresh();
  return { ok: true, message: "Note saved." };
}

export async function deleteOrderAction(id: string): Promise<ActionResult> {
  const admin = await getAdminForAction();
  if (!admin) return UNAUTHORIZED;
  if (!idSchema.safeParse(id).success) return { ok: false, error: "Invalid request." };

  const { error } = await admin.supabase.rpc("admin_delete_order", { p_id: id });
  if (error && error.message !== "ORDER_NOT_FOUND") {
    console.error("[orders] delete failed:", error.code, error.message);
    return { ok: false, error: "Could not delete the order." };
  }
  return { ok: true, message: "Order deleted." };
}
