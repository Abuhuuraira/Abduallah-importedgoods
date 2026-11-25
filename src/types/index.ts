import type { ProductStatus } from "./database";

export type { ProductStatus };

export type Category = {
  id: string;
  name: string;
  slug: string;
  created_at: string;
};

export type CategoryWithCount = Category & {
  product_count: number;
};

/** Minimal product data needed to render a product card. */
export type ProductCardData = {
  id: string;
  product_code: string;
  name: string;
  slug: string;
  price: number | null;
  image_url: string;
  status: ProductStatus;
  is_new_arrival: boolean;
  category_name: string | null;
  category_slug: string | null;
  created_at: string;
};

export type ProductDetail = ProductCardData & {
  description: string;
  category_id: string | null;
  updated_at: string;
};

export type AdminProduct = ProductDetail & {
  image_path: string;
  is_published: boolean;
  version: number;
};

export type SiteSettings = {
  businessName: string;
  logoUrl: string | null;
  logoPath: string | null;
  whatsappNumber: string;
  currency: string;
  welcomeText: string;
  contactPhone: string | null;
  contactEmail: string | null;
  address: string | null;
  businessHours: string | null;
};

export type SortOption = "newest" | "oldest" | "price_asc" | "price_desc";

export type ProductQuery = {
  q?: string;
  category?: string;
  available?: boolean;
  newArrivals?: boolean;
  sort?: SortOption;
  limit?: number;
  offset?: number;
};

export type ProductListResult = {
  items: ProductCardData[];
  total: number;
  /** True when the catalog could not be loaded (database unreachable / not set up). */
  failed: boolean;
};

export type FieldErrors = Partial<Record<string, string[]>>;

export type ActionResult<T = undefined> =
  | { ok: true; message?: string; data?: T }
  | { ok: false; error: string; fieldErrors?: FieldErrors; code?: string };

export type DashboardStats = {
  total_products: number;
  published_products: number;
  draft_products: number;
  available_products: number;
  booked_products: number;
  total_categories: number;
};
