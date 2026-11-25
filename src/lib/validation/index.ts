import { z } from "zod";
import { LOGO_PATH_REGEX, PRODUCT_IMAGE_PATH_REGEX } from "@/lib/constants";
import { normalizeWhatsAppNumber } from "@/lib/whatsapp";
import type { FieldErrors } from "@/types";

// ---------------------------------------------------------------------------
// Shared helpers for FormData values
// ---------------------------------------------------------------------------

const checkbox = z.preprocess(
  (v) => v === "on" || v === "true" || v === true || v === "1",
  z.boolean(),
);

const optionalText = (max: number, label: string) =>
  z.preprocess(
    (v) => (typeof v === "string" ? v.trim() : v ?? ""),
    z.string().max(max, `${label} must be at most ${max} characters`),
  );

const nullableText = (max: number, label: string) =>
  optionalText(max, label).transform((v) => (v === "" ? null : v));

/** "2,500" / "Rs. 2500" / "2500.50" → number; empty → null ("price on request"). */
const price = z.preprocess(
  (v) => {
    if (v === null || v === undefined) return null;
    const s = String(v).replace(/[,\s]/g, "").replace(/^rs\.?/i, "");
    return s === "" ? null : s;
  },
  z
    .string()
    .regex(/^\d{1,10}(\.\d{1,2})?$/, "Enter a valid price, e.g. 2500 or 2500.50")
    .transform(Number)
    .nullable(),
);

const uuid = z.guid("Invalid ID");

export function fieldErrorsOf(error: z.ZodError): FieldErrors {
  return z.flattenError(error).fieldErrors as FieldErrors;
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export const loginSchema = z.object({
  email: z.preprocess(
    (v) => (typeof v === "string" ? v.trim().toLowerCase() : v),
    z.email("Enter a valid email address").max(254),
  ),
  password: z.string().min(1, "Enter your password").max(200),
});

export const passwordChangeSchema = z
  .object({
    password: z
      .string()
      .min(8, "Use at least 8 characters")
      .max(72, "Use at most 72 characters")
      .refine((v) => /[A-Za-z]/.test(v) && /\d/.test(v), "Use letters and at least one number"),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { message: "The passwords do not match", path: ["confirm"] });

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

export const productBaseSchema = z.object({
  name: z.preprocess(
    (v) => (typeof v === "string" ? v.trim().replace(/\s+/g, " ") : v),
    z
      .string({ error: "Product name is required" })
      .min(2, "Product name must be at least 2 characters")
      .max(150, "Product name must be at most 150 characters"),
  ),
  description: optionalText(5000, "Description"),
  price,
  category_id: z.preprocess((v) => (v === "" || v === "none" || v == null ? null : v), uuid.nullable()),
  status: z.enum(["available", "booked"], { error: "Choose Available or Booked" }),
  is_published: checkbox,
  is_new_arrival: checkbox,
  image_path: z
    .string({ error: "Please upload a product image" })
    .regex(PRODUCT_IMAGE_PATH_REGEX, "Please upload a product image"),
});

export const productCreateSchema = productBaseSchema;

export const productUpdateSchema = productBaseSchema.extend({
  id: uuid,
  version: z.coerce.number().int().positive(),
});

export type ProductInput = z.infer<typeof productBaseSchema>;

export const idSchema = uuid;

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export const categorySchema = z.object({
  name: z.preprocess(
    (v) => (typeof v === "string" ? v.trim().replace(/\s+/g, " ") : v),
    z
      .string({ error: "Category name is required" })
      .min(2, "Category name must be at least 2 characters")
      .max(80, "Category name must be at most 80 characters"),
  ),
});

export const categoryUpdateSchema = categorySchema.extend({ id: uuid });

export const categoryDeleteSchema = z.object({
  id: uuid,
  moveProducts: z.boolean().default(false),
  targetCategoryId: uuid.nullable().default(null),
});

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

export const settingsSchema = z.object({
  business_name: z.preprocess(
    (v) => (typeof v === "string" ? v.trim().replace(/\s+/g, " ") : v),
    z
      .string({ error: "Business name is required" })
      .min(2, "Business name must be at least 2 characters")
      .max(100, "Business name must be at most 100 characters"),
  ),
  whatsapp_number: z
    .string({ error: "WhatsApp number is required" })
    .transform((v, ctx) => {
      const normalized = normalizeWhatsAppNumber(v);
      if (!normalized) {
        ctx.addIssue({
          code: "custom",
          message: "Enter the number in international format, e.g. 923001234567",
        });
        return z.NEVER;
      }
      return normalized;
    }),
  currency: z.preprocess(
    (v) => (typeof v === "string" && v.trim() ? v.trim().toUpperCase() : "PKR"),
    z.string().regex(/^[A-Z.]{1,10}$/, "Use a currency code such as PKR"),
  ),
  welcome_text: optionalText(500, "Welcome text"),
  contact_phone: nullableText(30, "Phone"),
  contact_email: z.preprocess(
    (v) => (typeof v === "string" ? v.trim() : ""),
    z.union([z.literal(""), z.email("Enter a valid email address").max(254)]),
  ).transform((v) => (v === "" ? null : v)),
  address: nullableText(300, "Address"),
  business_hours: nullableText(120, "Business hours"),
  logo_path: z.preprocess(
    (v) => (typeof v === "string" ? v.trim() : ""),
    z.union([z.literal(""), z.string().regex(LOGO_PATH_REGEX, "Invalid logo file")]),
  ).transform((v) => (v === "" ? null : v)),
});

export type SettingsInput = z.infer<typeof settingsSchema>;
