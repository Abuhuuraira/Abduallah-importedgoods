import { describe, expect, it } from "vitest";
import {
  categorySchema,
  loginSchema,
  passwordChangeSchema,
  productCreateSchema,
  productUpdateSchema,
  settingsSchema,
} from "@/lib/validation";

const validProduct = {
  name: "  Imported   Wireless Headphones ",
  description: "Bluetooth 5.3",
  price: "2,500",
  category_id: "",
  status: "available",
  is_published: "on",
  is_new_arrival: null,
  image_path: "products/0b7c9a1e-1111-4222-8333-944455556666.webp",
};

describe("product validation", () => {
  it("accepts and normalizes a valid product", () => {
    const result = productCreateSchema.safeParse(validProduct);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data).toMatchObject({
      name: "Imported Wireless Headphones",
      price: 2500,
      category_id: null,
      is_published: true,
      is_new_arrival: false,
    });
  });

  it("requires a name and an uploaded image", () => {
    const result = productCreateSchema.safeParse({ ...validProduct, name: " ", image_path: "" });
    expect(result.success).toBe(false);
    if (result.success) return;
    const paths = result.error.issues.map((i) => i.path[0]);
    expect(paths).toContain("name");
    expect(paths).toContain("image_path");
  });

  it("rejects image paths outside the products folder", () => {
    for (const image_path of ["../secret.png", "branding/logo.png", "products/a.gif", "products/../../x.png"]) {
      expect(productCreateSchema.safeParse({ ...validProduct, image_path }).success).toBe(false);
    }
  });

  it("handles prices", () => {
    const priceOf = (price: unknown) => {
      const result = productCreateSchema.safeParse({ ...validProduct, price });
      return result.success ? result.data.price : "invalid";
    };
    expect(priceOf("")).toBeNull();
    expect(priceOf("Rs. 1,250.50")).toBe(1250.5);
    expect(priceOf("19.99")).toBe(19.99);
    expect(priceOf("0")).toBe(0);
    expect(priceOf("-5")).toBe("invalid");
    expect(priceOf("12.345")).toBe("invalid");
    expect(priceOf("abc")).toBe("invalid");
  });

  it("only allows known statuses and valid category ids", () => {
    expect(productCreateSchema.safeParse({ ...validProduct, status: "sold" }).success).toBe(false);
    expect(productCreateSchema.safeParse({ ...validProduct, category_id: "not-a-uuid" }).success).toBe(false);
    expect(
      productCreateSchema.safeParse({ ...validProduct, category_id: "0b7c9a1e-1111-4222-8333-944455556666" }).success,
    ).toBe(true);
  });

  it("requires id and version for updates", () => {
    expect(productUpdateSchema.safeParse(validProduct).success).toBe(false);
    expect(
      productUpdateSchema.safeParse({ ...validProduct, id: "0b7c9a1e-1111-4222-8333-944455556666", version: "3" }).success,
    ).toBe(true);
  });
});

describe("settings validation", () => {
  const base = {
    business_name: "Abdullah Imported Goods",
    whatsapp_number: "0300 1234567",
    currency: "pkr",
    welcome_text: "Welcome",
    contact_phone: "",
    contact_email: "",
    address: "",
    business_hours: "",
    logo_path: "",
  };

  it("normalizes the WhatsApp number and empty fields", () => {
    const result = settingsSchema.safeParse(base);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.whatsapp_number).toBe("923001234567");
    expect(result.data.currency).toBe("PKR");
    expect(result.data.contact_email).toBeNull();
    expect(result.data.logo_path).toBeNull();
  });

  it("rejects an invalid WhatsApp number or email", () => {
    expect(settingsSchema.safeParse({ ...base, whatsapp_number: "123" }).success).toBe(false);
    expect(settingsSchema.safeParse({ ...base, contact_email: "not-an-email" }).success).toBe(false);
  });

  it("only accepts logos from the branding folder", () => {
    expect(settingsSchema.safeParse({ ...base, logo_path: "branding/abc.png" }).success).toBe(true);
    expect(settingsSchema.safeParse({ ...base, logo_path: "products/abc.png" }).success).toBe(false);
  });
});

describe("password change", () => {
  it("requires a strong, confirmed password", () => {
    expect(passwordChangeSchema.safeParse({ password: "secret123", confirm: "secret123" }).success).toBe(true);
    expect(passwordChangeSchema.safeParse({ password: "short1", confirm: "short1" }).success).toBe(false);
    expect(passwordChangeSchema.safeParse({ password: "onlyletters", confirm: "onlyletters" }).success).toBe(false);
    expect(passwordChangeSchema.safeParse({ password: "secret123", confirm: "secret124" }).success).toBe(false);
  });
});

describe("other schemas", () => {
  it("validates category names", () => {
    expect(categorySchema.safeParse({ name: "  Kitchen   Items " }).data?.name).toBe("Kitchen Items");
    expect(categorySchema.safeParse({ name: "a" }).success).toBe(false);
  });
  it("validates login input", () => {
    expect(loginSchema.safeParse({ email: " Admin@Example.com ", password: "x" }).data?.email).toBe("admin@example.com");
    expect(loginSchema.safeParse({ email: "nope", password: "x" }).success).toBe(false);
    expect(loginSchema.safeParse({ email: "a@b.co", password: "" }).success).toBe(false);
  });
});
