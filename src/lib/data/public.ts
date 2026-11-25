import "server-only";

import { cacheLife, cacheTag } from "next/cache";
import { CACHE_TAGS, DEFAULT_SETTINGS, PUBLIC_PAGE_SIZE } from "@/lib/constants";
import { getPublicSupabase } from "@/lib/supabase/public";
import { searchRowToCard, settingsRowToSettings, toNumberOrNull } from "@/lib/data/mappers";
import type {
  CategoryWithCount,
  ProductCardData,
  ProductDetail,
  ProductListResult,
  ProductQuery,
  SiteSettings,
  SortOption,
} from "@/types";

/*
 * Public catalog data. Every function here:
 * - uses the cookie-less anonymous client, so RLS only exposes published data
 * - is cached with "use cache" and tagged, so admin changes call updateTag()
 *   and customers see them immediately (see src/lib/actions/*)
 * - never throws: failures are logged and cached only briefly
 */

const SLUG_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const SORTS: SortOption[] = ["newest", "oldest", "price_asc", "price_desc"];

type NormalizedQuery = Required<ProductQuery>;

export function normalizeProductQuery(query: ProductQuery = {}): NormalizedQuery {
  const q = (query.q ?? "").trim().replace(/\s+/g, " ").slice(0, 100);
  const category = query.category && SLUG_REGEX.test(query.category) ? query.category : "";
  const sort = query.sort && SORTS.includes(query.sort) ? query.sort : "newest";
  const limit = Math.min(Math.max(Math.trunc(query.limit ?? PUBLIC_PAGE_SIZE), 1), 48);
  const offset = Math.min(Math.max(Math.trunc(query.offset ?? 0), 0), 100_000);
  return {
    q,
    category,
    available: Boolean(query.available),
    newArrivals: Boolean(query.newArrivals),
    sort,
    limit,
    offset,
  };
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

export async function getSiteSettings(): Promise<SiteSettings> {
  "use cache";
  cacheTag(CACHE_TAGS.settings);

  const supabase = getPublicSupabase();
  if (!supabase) {
    cacheLife("minutes");
    return DEFAULT_SETTINGS;
  }

  const { data, error } = await supabase
    .from("admin_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    console.error("[data] Failed to load settings:", error.message);
    cacheLife("minutes");
    return DEFAULT_SETTINGS;
  }

  cacheLife("hours");
  return settingsRowToSettings(data);
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export async function getCategories(): Promise<CategoryWithCount[]> {
  "use cache";
  cacheTag(CACHE_TAGS.categories, CACHE_TAGS.products);

  const supabase = getPublicSupabase();
  if (!supabase) {
    cacheLife("minutes");
    return [];
  }

  const { data, error } = await supabase.rpc("get_categories_with_counts");
  if (error) {
    console.error("[data] Failed to load categories:", error.message);
    cacheLife("minutes");
    return [];
  }

  cacheLife("hours");
  return (data ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    created_at: c.created_at,
    product_count: Number(c.product_count) || 0,
  }));
}

// ---------------------------------------------------------------------------
// Product lists (home page sections, /products, Load More API)
// ---------------------------------------------------------------------------

export async function listProducts(query: ProductQuery = {}): Promise<ProductListResult> {
  return fetchProductList(normalizeProductQuery(query));
}

async function fetchProductList(query: NormalizedQuery): Promise<ProductListResult> {
  "use cache";
  cacheTag(CACHE_TAGS.products, CACHE_TAGS.categories);

  const supabase = getPublicSupabase();
  if (!supabase) {
    cacheLife("minutes");
    return { items: [], total: 0, failed: true };
  }

  const { data, error } = await supabase.rpc("search_products", {
    p_query: query.q || null,
    p_category_slug: query.category || null,
    p_available_only: query.available,
    p_new_arrivals_only: query.newArrivals,
    p_sort: query.sort,
    p_limit: query.limit,
    p_offset: query.offset,
    p_publication: "published",
  });

  if (error) {
    console.error("[data] Failed to load products:", error.message);
    cacheLife("minutes");
    return { items: [], total: 0, failed: true };
  }

  cacheLife("hours");
  const rows = data ?? [];
  return {
    items: rows.map(searchRowToCard),
    total: rows.length > 0 ? Number(rows[0].total_count) : query.offset,
    failed: false,
  };
}

// ---------------------------------------------------------------------------
// Single product
// ---------------------------------------------------------------------------

export async function getProductBySlug(slug: string): Promise<ProductDetail | null> {
  if (!SLUG_REGEX.test(slug) || slug.length > 120) return null;
  return fetchProductBySlug(slug);
}

async function fetchProductBySlug(slug: string): Promise<ProductDetail | null> {
  "use cache";
  cacheTag(CACHE_TAGS.products, CACHE_TAGS.categories);

  const supabase = getPublicSupabase();
  if (!supabase) {
    cacheLife("minutes");
    return null;
  }

  const { data, error } = await supabase
    .from("products")
    .select(
      "id, product_code, name, slug, description, price, image_url, status, is_new_arrival, created_at, updated_at, category_id, category:categories(name, slug)",
    )
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();

  if (error) {
    console.error("[data] Failed to load product:", error.message);
    cacheLife("minutes");
    return null;
  }

  cacheLife("hours");
  if (!data) return null;

  return {
    id: data.id,
    product_code: data.product_code,
    name: data.name,
    slug: data.slug,
    description: data.description,
    price: toNumberOrNull(data.price),
    image_url: data.image_url,
    status: data.status,
    is_new_arrival: data.is_new_arrival,
    created_at: data.created_at,
    updated_at: data.updated_at,
    category_id: data.category_id,
    category_name: data.category?.name ?? null,
    category_slug: data.category?.slug ?? null,
  };
}

/** Up to `limit` products from the same category, topped up with the latest products. */
export async function getRelatedProducts(
  product: Pick<ProductDetail, "id" | "category_slug">,
  limit = 4,
): Promise<ProductCardData[]> {
  const related: ProductCardData[] = [];
  const seen = new Set<string>([product.id]);

  if (product.category_slug) {
    const sameCategory = await listProducts({ category: product.category_slug, limit: limit + 1 });
    for (const item of sameCategory.items) {
      if (!seen.has(item.id) && related.length < limit) {
        related.push(item);
        seen.add(item.id);
      }
    }
  }

  if (related.length < limit) {
    const latest = await listProducts({ limit: limit + 1 + related.length });
    for (const item of latest.items) {
      if (!seen.has(item.id) && related.length < limit) {
        related.push(item);
        seen.add(item.id);
      }
    }
  }

  return related;
}

// ---------------------------------------------------------------------------
// Slugs for prerendering and the sitemap
// ---------------------------------------------------------------------------

export async function getPublishedProductSlugs(
  limit = 50,
): Promise<{ slug: string; updated_at: string }[]> {
  "use cache";
  cacheTag(CACHE_TAGS.products);

  const supabase = getPublicSupabase();
  if (!supabase) {
    cacheLife("minutes");
    return [];
  }

  const { data, error } = await supabase
    .from("products")
    .select("slug, updated_at")
    .eq("is_published", true)
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[data] Failed to load product slugs:", error.message);
    cacheLife("minutes");
    return [];
  }

  cacheLife("hours");
  return data ?? [];
}
