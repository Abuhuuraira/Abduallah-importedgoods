import type { Database } from "@/types/database";
import type { AdminProduct, ProductCardData, SiteSettings } from "@/types";
import { DEFAULT_SETTINGS } from "@/lib/constants";

type SearchRow = Database["public"]["Functions"]["search_products"]["Returns"][number];
type SettingsRow = Database["public"]["Tables"]["admin_settings"]["Row"];

export function toNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function searchRowToCard(row: SearchRow): ProductCardData {
  return {
    id: row.id,
    product_code: row.product_code,
    name: row.name,
    slug: row.slug,
    price: toNumberOrNull(row.price),
    image_url: row.image_url,
    status: row.status,
    is_new_arrival: row.is_new_arrival,
    category_name: row.category_name,
    category_slug: row.category_slug,
    created_at: row.created_at,
  };
}

export function searchRowToAdminProduct(row: SearchRow): AdminProduct {
  return {
    ...searchRowToCard(row),
    description: row.description,
    category_id: row.category_id,
    updated_at: row.updated_at,
    image_path: row.image_path,
    is_published: row.is_published,
    version: row.version,
  };
}

export function settingsRowToSettings(row: SettingsRow | null): SiteSettings {
  if (!row) return DEFAULT_SETTINGS;
  return {
    businessName: row.business_name || DEFAULT_SETTINGS.businessName,
    logoUrl: row.logo_url,
    logoPath: row.logo_path,
    whatsappNumber: row.whatsapp_number,
    currency: row.currency || "PKR",
    welcomeText: row.welcome_text || DEFAULT_SETTINGS.welcomeText,
    contactPhone: row.contact_phone,
    contactEmail: row.contact_email,
    address: row.address,
    businessHours: row.business_hours,
  };
}
