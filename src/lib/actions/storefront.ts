"use server";

import { after } from "next/server";
import { isAnalyticsNotInstalled as isMissingFunction } from "@/lib/analytics";
import { formatOrderNumber } from "@/lib/orders";
import { sendAdminPush } from "@/lib/push";
import { getPublicSupabase } from "@/lib/supabase/public";
import { fieldErrorsOf, idSchema, orderSchema } from "@/lib/validation";
import type { ActionResult } from "@/types";

/*
 * Actions used by customers on the public website. They run as an anonymous
 * visitor: the database functions validate everything again and enforce
 * rate limits, so these can never read or change anything else.
 */

export type PlacedOrder = {
  orderLabel: string;
  productName: string;
  quantity: number;
  whatsapp: string;
};

const HONEYPOT_FIELD = "hp_field_7c";

function codeOf(error: { message?: string; code?: string }): string {
  return (error.message ?? "").trim();
}

export async function placeOrderAction(
  _prev: ActionResult<PlacedOrder> | null,
  formData: FormData,
): Promise<ActionResult<PlacedOrder>> {
  const supabase = getPublicSupabase();
  if (!supabase) {
    return { ok: false, error: "Online ordering is not available right now. Please order on WhatsApp." };
  }

  // Bots fill every field, people never see this one.
  if (String(formData.get(HONEYPOT_FIELD) ?? "").trim() !== "") {
    return { ok: false, error: "Could not place the order. Please try again." };
  }

  const parsed = orderSchema.safeParse({
    productId: formData.get("productId"),
    quantity: formData.get("quantity"),
    name: formData.get("name"),
    whatsapp: formData.get("whatsapp"),
    address: formData.get("address"),
    note: formData.get("note"),
  });
  if (!parsed.success) {
    return { ok: false, error: "Please check the highlighted fields.", fieldErrors: fieldErrorsOf(parsed.error) };
  }
  const input = parsed.data;

  const { data, error } = await supabase.rpc("place_order", {
    p_product_id: input.productId,
    p_quantity: input.quantity,
    p_customer_name: input.name,
    p_customer_whatsapp: input.whatsapp,
    p_customer_address: input.address,
    p_customer_note: input.note,
  });

  if (error) {
    const code = codeOf(error);
    if (isMissingFunction(error)) {
      return { ok: false, error: "Online ordering is being set up. Please order on WhatsApp for now." };
    }
    if (code === "PRODUCT_BOOKED") {
      return { ok: false, code, error: "Sorry, this product was just booked. Please ask us on WhatsApp about similar items." };
    }
    if (code === "PRODUCT_NOT_FOUND") {
      return { ok: false, code, error: "Sorry, this product is no longer available." };
    }
    if (code === "ORDER_RATE_LIMIT") {
      return {
        ok: false,
        code,
        error: "You have placed several orders in a short time. Please wait a little, or message us on WhatsApp.",
      };
    }
    const fields: Record<string, [string, string]> = {
      INVALID_NAME: ["name", "Please enter your name"],
      INVALID_WHATSAPP: ["whatsapp", "Enter a valid WhatsApp number, e.g. 0300 1234567"],
      INVALID_ADDRESS: ["address", "Please enter your full delivery address"],
      INVALID_QUANTITY: ["quantity", "Quantity must be between 1 and 9999"],
      INVALID_NOTE: ["note", "Note must be at most 500 characters"],
    };
    if (fields[code]) {
      const [field, message] = fields[code];
      return { ok: false, error: "Please check the highlighted fields.", fieldErrors: { [field]: [message] } };
    }
    console.error("[orders] place_order failed:", error.code, error.message);
    return { ok: false, error: "Could not place your order. Please try again in a moment." };
  }

  const result = (data ?? {}) as Record<string, unknown>;
  const orderId = String(result.order_id ?? "");
  const orderLabel = typeof result.order_label === "string" ? result.order_label : formatOrderNumber(Number(result.order_number));
  const productName = String(result.product_name ?? "");
  const productCode = String(result.product_code ?? "");

  // Notify admin devices after the customer already has their answer.
  after(async () => {
    await sendAdminPush("order", {
      title: `New order ${orderLabel}`,
      body: `${input.quantity} × ${productName} (${productCode}) — ${input.name}`,
      url: `/admin/orders/${orderId}`,
      tag: `order-${orderId}`,
    });
  });

  return {
    ok: true,
    message: "Order placed",
    data: { orderLabel, productName, quantity: input.quantity, whatsapp: input.whatsapp },
  };
}

export type LikeState = { liked: boolean; count: number };

export async function setLikeAction(productId: string, visitorId: string, liked: boolean): Promise<ActionResult<LikeState>> {
  const supabase = getPublicSupabase();
  if (!supabase) return { ok: false, error: "Likes are not available right now." };
  if (!idSchema.safeParse(productId).success || !idSchema.safeParse(visitorId).success || typeof liked !== "boolean") {
    return { ok: false, error: "Invalid request." };
  }

  const { data, error } = await supabase.rpc("set_product_like", {
    p_product_id: productId,
    p_visitor_id: visitorId,
    p_liked: liked,
  });
  if (error) {
    if (isMissingFunction(error)) return { ok: false, code: "NOT_INSTALLED", error: "Likes are not available yet." };
    if (codeOf(error) === "PRODUCT_NOT_FOUND") return { ok: false, error: "This product is no longer available." };
    console.error("[likes] set_product_like failed:", error.code, error.message);
    return { ok: false, error: "Could not save your like. Please try again." };
  }

  const r = (data ?? {}) as Record<string, unknown>;
  const count = Number(r.count) || 0;
  if (r.notify === true) {
    const name = String(r.product_name ?? "");
    const code = String(r.product_code ?? "");
    after(async () => {
      await sendAdminPush("like", {
        title: "New like ❤️",
        body: `Someone liked ${name} (${code}). It now has ${count} ${count === 1 ? "like" : "likes"}.`,
        url: `/admin/products/${productId}/edit`,
        tag: `like-${productId}`,
      });
    });
  }
  return { ok: true, data: { liked: r.liked === true, count } };
}
