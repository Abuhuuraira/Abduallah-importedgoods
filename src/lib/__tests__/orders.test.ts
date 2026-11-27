import { describe, expect, it } from "vitest";
import {
  buildCustomerMessage,
  formatOrderNumber,
  isOrderStatus,
  ORDER_NEXT_STEPS,
  ORDER_STATUSES,
  orderTotal,
  parseOrder,
  parseOrderCounts,
} from "@/lib/orders";
import { orderSchema } from "@/lib/validation";

const base = {
  productId: "6f1c2a52-3a7e-4b8a-9c41-2f0d6b9a1e33",
  quantity: "2",
  name: "  Ali   Khan ",
  whatsapp: "0300 1234567",
  address: " House 5, Street 9,  Gulberg, Lahore ",
  note: "",
};

describe("orderSchema", () => {
  it("accepts a normal order and normalizes it", () => {
    const r = orderSchema.safeParse(base);
    expect(r.success).toBe(true);
    if (!r.success) return;
    expect(r.data).toEqual({
      productId: base.productId,
      quantity: 2,
      name: "Ali Khan",
      whatsapp: "923001234567",
      address: "House 5, Street 9, Gulberg, Lahore",
      note: "",
    });
  });
  it("defaults quantity to 1 and accepts +92 / 0092 numbers", () => {
    expect(orderSchema.parse({ ...base, quantity: "" }).quantity).toBe(1);
    expect(orderSchema.parse({ ...base, whatsapp: "+92 300-1234567" }).whatsapp).toBe("923001234567");
    expect(orderSchema.parse({ ...base, whatsapp: "0092 300 1234567" }).whatsapp).toBe("923001234567");
  });
  it("rejects bad input with friendly messages", () => {
    const errors = (input: Record<string, unknown>) => {
      const r = orderSchema.safeParse({ ...base, ...input });
      return r.success ? null : Object.keys(r.error.flatten().fieldErrors);
    };
    expect(errors({ name: "A" })).toEqual(["name"]);
    expect(errors({ whatsapp: "12345" })).toEqual(["whatsapp"]);
    expect(errors({ whatsapp: "" })).toEqual(["whatsapp"]);
    expect(errors({ whatsapp: "92300123" })).toEqual(["whatsapp"]); // too short for an order
    expect(errors({ address: "Lhr" })).toEqual(["address"]);
    expect(errors({ quantity: "0" })).toEqual(["quantity"]);
    expect(errors({ quantity: "1.5" })).toEqual(["quantity"]);
    expect(errors({ quantity: "10000" })).toEqual(["quantity"]);
    expect(errors({ note: "x".repeat(501) })).toEqual(["note"]);
    expect(errors({ productId: "nope" })).toEqual(["productId"]);
  });
});

describe("order helpers", () => {
  it("formats order numbers like the database", () => {
    expect(formatOrderNumber(1)).toBe("ORD-0001");
    expect(formatOrderNumber(42)).toBe("ORD-0042");
    expect(formatOrderNumber(12345)).toBe("ORD-12345");
  });
  it("knows the statuses and next steps", () => {
    expect(ORDER_STATUSES).toEqual(["new", "confirmed", "shipped", "delivered", "cancelled"]);
    expect(isOrderStatus("shipped")).toBe(true);
    expect(isOrderStatus("lost")).toBe(false);
    expect(ORDER_NEXT_STEPS.new.map((s) => s.to)).toEqual(["confirmed", "cancelled"]);
    expect(ORDER_NEXT_STEPS.delivered).toEqual([]);
    expect(ORDER_NEXT_STEPS.cancelled.map((s) => s.to)).toEqual(["new"]);
  });
  it("calculates totals", () => {
    expect(orderTotal({ unitPrice: 2500, quantity: 3 })).toBe(7500);
    expect(orderTotal({ unitPrice: 99.5, quantity: 3 })).toBe(298.5);
    expect(orderTotal({ unitPrice: null, quantity: 3 })).toBeNull();
  });
  it("parses database rows defensively", () => {
    const o = parseOrder({ id: "x", order_number: "7", unit_price: "2500.00", quantity: 2, status: "weird", product_id: null });
    expect(o.orderNumber).toBe(7);
    expect(o.unitPrice).toBe(2500);
    expect(o.status).toBe("new");
    expect(o.productId).toBeNull();
    expect(parseOrder({ unit_price: null }).unitPrice).toBeNull();
    expect(parseOrderCounts({ all: 3, new: "2" })).toEqual({ all: 3, new: 2, confirmed: 0, shipped: 0, delivered: 0, cancelled: 0 });
  });
  it("writes the WhatsApp message for the customer", () => {
    const order = parseOrder({
      id: "x",
      order_number: 7,
      product_name: "Air Fryer 5L",
      product_code: "AIG-012",
      unit_price: 18900,
      quantity: 2,
      customer_name: "Ali Khan",
      customer_address: "House 5, Lahore",
      status: "confirmed",
    });
    const msg = buildCustomerMessage(order, "Abdullah Imported Goods", "PKR");
    expect(msg).toContain("Assalam o Alaikum Ali Khan");
    expect(msg).toContain("ORD-0007 is confirmed");
    expect(msg).toContain("Air Fryer 5L (AIG-012) × 2");
    expect(msg).toContain("Total: Rs. 37,800 (cash on delivery)");
    expect(msg).toContain("House 5, Lahore");
    const noPrice = buildCustomerMessage({ ...order, unitPrice: null, status: "new" }, "Shop", "PKR");
    expect(noPrice).toContain("We will share the price with you.");
    expect(noPrice).toContain('reply "YES"');
  });
});
