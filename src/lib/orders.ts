/**
 * Cash-on-delivery orders — shared types and helpers (browser + server).
 */
import { formatPrice } from "@/lib/format";
import { formatWhatsAppNumberForDisplay } from "@/lib/whatsapp";

export const ORDER_STATUSES = ["new", "confirmed", "shipped", "delivered", "cancelled"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  new: "New",
  confirmed: "Confirmed",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

/** The next steps an admin can take from each status (first = main button). */
export const ORDER_NEXT_STEPS: Record<OrderStatus, { to: OrderStatus; label: string }[]> = {
  new: [
    { to: "confirmed", label: "Confirm order" },
    { to: "cancelled", label: "Cancel order" },
  ],
  confirmed: [
    { to: "shipped", label: "Mark as shipped" },
    { to: "delivered", label: "Mark as delivered" },
    { to: "cancelled", label: "Cancel order" },
  ],
  shipped: [
    { to: "delivered", label: "Mark as delivered" },
    { to: "cancelled", label: "Cancel order" },
  ],
  delivered: [],
  cancelled: [{ to: "new", label: "Reopen order" }],
};

export function isOrderStatus(value: unknown): value is OrderStatus {
  return typeof value === "string" && (ORDER_STATUSES as readonly string[]).includes(value);
}

/** 7 → "ORD-0007" (matches public.format_order_number in the database). */
export function formatOrderNumber(n: number): string {
  const s = String(Math.max(0, Math.trunc(n)));
  return `ORD-${s.padStart(4, "0")}`;
}

export type Order = {
  id: string;
  orderNumber: number;
  productId: string | null;
  productName: string;
  productCode: string;
  productSlug: string;
  productImageUrl: string;
  unitPrice: number | null;
  quantity: number;
  customerName: string;
  customerWhatsapp: string;
  customerAddress: string;
  customerNote: string;
  status: OrderStatus;
  adminNote: string;
  createdAt: string;
  updatedAt: string;
};

export type OrderCounts = Record<OrderStatus | "all", number>;

type Row = Record<string, unknown>;
const num = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const str = (v: unknown) => (typeof v === "string" ? v : v == null ? "" : String(v));
const numOrNull = (v: unknown) => (v === null || v === undefined || v === "" || !Number.isFinite(Number(v)) ? null : Number(v));

export function parseOrder(raw: unknown): Order {
  const r = (raw && typeof raw === "object" ? raw : {}) as Row;
  const status = str(r.status);
  return {
    id: str(r.id),
    orderNumber: num(r.order_number),
    productId: typeof r.product_id === "string" ? r.product_id : null,
    productName: str(r.product_name),
    productCode: str(r.product_code),
    productSlug: str(r.product_slug),
    productImageUrl: str(r.product_image_url),
    unitPrice: numOrNull(r.unit_price),
    quantity: Math.max(1, num(r.quantity)),
    customerName: str(r.customer_name),
    customerWhatsapp: str(r.customer_whatsapp),
    customerAddress: str(r.customer_address),
    customerNote: str(r.customer_note),
    status: isOrderStatus(status) ? status : "new",
    adminNote: str(r.admin_note),
    createdAt: str(r.created_at),
    updatedAt: str(r.updated_at),
  };
}

export function parseOrderCounts(raw: unknown): OrderCounts {
  const r = (raw && typeof raw === "object" ? raw : {}) as Row;
  return {
    all: num(r.all),
    new: num(r.new),
    confirmed: num(r.confirmed),
    shipped: num(r.shipped),
    delivered: num(r.delivered),
    cancelled: num(r.cancelled),
  };
}

export function orderTotal(order: Pick<Order, "unitPrice" | "quantity">): number | null {
  return order.unitPrice === null ? null : Math.round(order.unitPrice * order.quantity * 100) / 100;
}

/** Message the admin sends to the customer on WhatsApp, depending on the order status. */
export function buildCustomerMessage(order: Order, businessName: string, currency: string): string {
  const label = formatOrderNumber(order.orderNumber);
  const total = orderTotal(order);
  const item = `${order.productName} (${order.productCode}) × ${order.quantity}`;
  const amount = total === null ? "We will share the price with you." : `Total: ${formatPrice(total, currency)} (cash on delivery)`;
  const greeting = `Assalam o Alaikum ${order.customerName},`;

  switch (order.status) {
    case "new":
      return `${greeting}\n\nThank you for your order ${label} with ${businessName}.\n${item}\n${amount}\n\nPlease reply "YES" to confirm. We will deliver to:\n${order.customerAddress}`;
    case "confirmed":
      return `${greeting}\n\nYour order ${label} is confirmed ✅\n${item}\n${amount}\n\nWe will deliver to:\n${order.customerAddress}`;
    case "shipped":
      return `${greeting}\n\nGood news! Your order ${label} has been sent 🚚\n${item}\n${amount}\n\nPlease keep the cash ready when it arrives.`;
    case "delivered":
      return `${greeting}\n\nYour order ${label} has been delivered. Thank you for shopping with ${businessName}! 🙏`;
    case "cancelled":
      return `${greeting}\n\nYour order ${label} (${item}) has been cancelled. Please message us if you have any questions.`;
  }
}

export function displayPhone(number: string): string {
  return formatWhatsAppNumberForDisplay(number);
}
