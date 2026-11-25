import { describe, expect, it } from "vitest";
import {
  buildBookingMessage,
  buildInquiryMessage,
  buildWhatsAppUrl,
  formatWhatsAppNumberForDisplay,
  isValidWhatsAppNumber,
  normalizeWhatsAppNumber,
} from "@/lib/whatsapp";

const product = {
  name: "Imported Wireless Headphones",
  product_code: "AIG-001",
  price: 2500,
  status: "available" as const,
  image_url: "https://x.supabase.co/storage/v1/object/public/product-images/products/a.webp",
};
const ctx = {
  businessName: "Abdullah Imported Goods",
  currency: "PKR",
  productUrl: "https://yourwebsite.com/products/imported-wireless-headphones",
};

describe("normalizeWhatsAppNumber", () => {
  it("accepts international format", () => {
    expect(normalizeWhatsAppNumber("923001234567")).toBe("923001234567");
  });
  it("strips +, spaces and dashes", () => {
    expect(normalizeWhatsAppNumber("+92 300-1234567")).toBe("923001234567");
  });
  it("converts 00 prefix", () => {
    expect(normalizeWhatsAppNumber("00923001234567")).toBe("923001234567");
  });
  it("converts local Pakistani mobile numbers", () => {
    expect(normalizeWhatsAppNumber("0300 1234567")).toBe("923001234567");
  });
  it("rejects invalid numbers", () => {
    expect(normalizeWhatsAppNumber("")).toBeNull();
    expect(normalizeWhatsAppNumber("12345")).toBeNull();
    expect(normalizeWhatsAppNumber("abc")).toBeNull();
    expect(normalizeWhatsAppNumber("0123456789012345678")).toBeNull();
  });
  it("validates stored numbers", () => {
    expect(isValidWhatsAppNumber("923001234567")).toBe(true);
    expect(isValidWhatsAppNumber("+923001234567")).toBe(false);
    expect(isValidWhatsAppNumber("")).toBe(false);
    expect(isValidWhatsAppNumber(null)).toBe(false);
  });
  it("formats numbers for display", () => {
    expect(formatWhatsAppNumberForDisplay("923001234567")).toBe("+92 300 1234567");
    expect(formatWhatsAppNumberForDisplay("971501234567")).toBe("+971501234567");
  });
});

describe("buildWhatsAppUrl", () => {
  it("uses the official wa.me click-to-chat format", () => {
    expect(buildWhatsAppUrl("923001234567")).toBe("https://wa.me/923001234567");
  });
  it("URL-encodes the message", () => {
    const url = buildWhatsAppUrl("923001234567", "Hello & welcome!\nPrice: Rs. 2,500");
    expect(url).toBe("https://wa.me/923001234567?text=Hello%20%26%20welcome!%0APrice%3A%20Rs.%202%2C500");
    expect(decodeURIComponent(new URL(url).searchParams.get("text")!)).toBe("Hello & welcome!\nPrice: Rs. 2,500");
  });
});

describe("booking message", () => {
  it("matches the required format exactly", () => {
    expect(buildBookingMessage(product, ctx)).toBe(
      [
        "Assalamualaikum Abdullah Imported Goods!",
        "",
        "I want to book this product.",
        "",
        "Product Name: Imported Wireless Headphones",
        "Product ID: AIG-001",
        "Price: Rs. 2,500",
        "",
        "Product Link: https://yourwebsite.com/products/imported-wireless-headphones",
        "",
        "Please confirm its availability.",
      ].join("\n"),
    );
  });
  it("shows price on request when there is no price", () => {
    expect(buildBookingMessage({ ...product, price: null }, ctx)).toContain("Price: Price on request");
  });
});

describe("inquiry message", () => {
  it("is different from the booking message and includes the link and image URL", () => {
    const msg = buildInquiryMessage(product, ctx);
    expect(msg).not.toBe(buildBookingMessage(product, ctx));
    expect(msg).toContain("I would like more information about this product.");
    expect(msg).toContain("Product Link: https://yourwebsite.com/products/imported-wireless-headphones");
    expect(msg).toContain(`Product Image: ${product.image_url}`);
    expect(msg).toContain("Status: Available");
  });
  it("asks about future stock for booked products", () => {
    const msg = buildInquiryMessage({ ...product, status: "booked" }, ctx);
    expect(msg).toContain("currently booked");
    expect(msg).toContain("Status: Booked");
  });
});
