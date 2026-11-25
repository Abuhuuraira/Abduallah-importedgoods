import { formatPrice } from "./format";

/**
 * WhatsApp Click-to-Chat helpers.
 *
 * Uses the official format: https://wa.me/<number>?text=<url-encoded message>
 * - <number> is the full international number WITHOUT "+", spaces or dashes.
 * - On phones this opens the WhatsApp app; on desktop it opens WhatsApp Web
 *   (or offers to), so no extra fallback logic is needed.
 * - Click-to-Chat cannot attach images. We include the product page link and
 *   the public image URL as text instead; WhatsApp shows a link preview.
 */

export type WhatsAppProduct = {
  name: string;
  product_code: string;
  price: number | null;
  status: "available" | "booked";
  image_url?: string | null;
};

/** Validates & normalizes a WhatsApp number to international format, e.g. 923001234567. */
export function normalizeWhatsAppNumber(input: string): string | null {
  let digits = input.replace(/[^\d]/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  // Local Pakistani mobile format 03XXXXXXXXX → 923XXXXXXXXX
  if (digits.length === 11 && digits.startsWith("03")) digits = `92${digits.slice(1)}`;
  return /^[1-9]\d{7,14}$/.test(digits) ? digits : null;
}

export function isValidWhatsAppNumber(value: string | null | undefined): value is string {
  return !!value && /^[1-9]\d{7,14}$/.test(value);
}

/** "923001234567" → "+92 300 1234567" for display. */
export function formatWhatsAppNumberForDisplay(number: string): string {
  if (/^92\d{10}$/.test(number)) {
    return `+92 ${number.slice(2, 5)} ${number.slice(5)}`;
  }
  return `+${number}`;
}

export function buildWhatsAppUrl(number: string, message?: string): string {
  const base = `https://wa.me/${number}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

type MessageContext = {
  businessName: string;
  currency: string;
  productUrl: string;
};

export function buildBookingMessage(product: WhatsAppProduct, ctx: MessageContext): string {
  return [
    `Assalamualaikum ${ctx.businessName}!`,
    "",
    "I want to book this product.",
    "",
    `Product Name: ${product.name}`,
    `Product ID: ${product.product_code}`,
    `Price: ${formatPrice(product.price, ctx.currency)}`,
    "",
    `Product Link: ${ctx.productUrl}`,
    "",
    "Please confirm its availability.",
  ].join("\n");
}

export function buildInquiryMessage(product: WhatsAppProduct, ctx: MessageContext): string {
  const booked = product.status === "booked";
  const lines = [
    `Assalamualaikum ${ctx.businessName}!`,
    "",
    booked
      ? "I am interested in this product. I can see it is currently booked — will it be available again, or do you have similar stock coming?"
      : "I would like more information about this product.",
    "",
    `Product Name: ${product.name}`,
    `Product ID: ${product.product_code}`,
    `Price: ${formatPrice(product.price, ctx.currency)}`,
    `Status: ${booked ? "Booked" : "Available"}`,
    "",
    `Product Link: ${ctx.productUrl}`,
  ];
  if (product.image_url) {
    lines.push(`Product Image: ${product.image_url}`);
  }
  lines.push("", booked ? "Please let me know. JazakAllah!" : "Please share more details. JazakAllah!");
  return lines.join("\n");
}

export function buildGeneralMessage(businessName: string): string {
  return `Assalamualaikum ${businessName}!\n\nI would like to know more about your products.`;
}
