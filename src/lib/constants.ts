import type { SiteSettings, SortOption } from "@/types";

/** Supabase Storage bucket that holds product images and the business logo. */
export const STORAGE_BUCKET = "product-images";

/** Products per "page" on the public site (initial render + each Load More). */
export const PUBLIC_PAGE_SIZE = 12;
/** Products per page in the admin product list. */
export const ADMIN_PAGE_SIZE = 20;

/** Largest file an admin may pick (before compression). */
export const MAX_IMAGE_INPUT_BYTES = 15 * 1024 * 1024;
/** Largest file the storage bucket accepts (enforced by Supabase too). */
export const MAX_IMAGE_STORED_BYTES = 5 * 1024 * 1024;
export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const ACCEPTED_IMAGE_EXTENSIONS = ".jpg,.jpeg,.png,.webp";

export const PRODUCT_IMAGE_PATH_REGEX = /^products\/[A-Za-z0-9_-]+\.(webp|jpg|jpeg|png)$/;
export const LOGO_PATH_REGEX = /^branding\/[A-Za-z0-9_-]+\.(webp|jpg|jpeg|png)$/;

/** Next.js cache tags used for on-demand revalidation. */
export const CACHE_TAGS = {
  products: "products",
  categories: "categories",
  settings: "settings",
} as const;

export const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "newest", label: "Newest first" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "oldest", label: "Oldest first" },
];

/** Used only until the admin_settings row can be read (e.g. before setup). */
export const DEFAULT_SETTINGS: SiteSettings = {
  businessName: "Abdullah Imported Goods",
  logoUrl: null,
  logoPath: null,
  whatsappNumber: "",
  currency: "PKR",
  welcomeText:
    "Quality imported goods at wholesale prices. Browse our latest stock and book instantly on WhatsApp.",
  contactPhone: null,
  contactEmail: null,
  address: null,
  businessHours: null,
};
