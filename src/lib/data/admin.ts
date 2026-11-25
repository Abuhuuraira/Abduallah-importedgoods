import "server-only";

import { requireAdmin } from "@/lib/auth";
import { ADMIN_PAGE_SIZE } from "@/lib/constants";
import { searchRowToAdminProduct, settingsRowToSettings, toNumberOrNull } from "@/lib/data/mappers";
import type { AdminProduct, CategoryWithCount, DashboardStats, SiteSettings } from "@/types";

/*
 * Admin data access. Every function calls requireAdmin() first, so even if a
 * page forgets to check, unauthorized users are redirected. All reads go
 * through the user's own session (RLS applies) — never a service key.
 */

export type AdminProductFilters = {
  q: string;
  category: string;
  status: "all" | "available" | "booked";
  publication: "all" | "published" | "draft";
  page: number;
};

type RawSearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

export function parseAdminFilters(params: RawSearchParams): AdminProductFilters {
  const status = first(params.status);
  const publication = first(params.publication);
  const category = first(params.category);
  const page = Number.parseInt(first(params.page), 10);
  return {
    q: first(params.q).trim().slice(0, 100),
    category: category === "__none__" || /^[a-z0-9]+(-[a-z0-9]+)*$/.test(category) ? category : "",
    status: status === "available" || status === "booked" ? status : "all",
    publication: publication === "published" || publication === "draft" ? publication : "all",
    page: Number.isFinite(page) && page > 0 ? Math.min(page, 10_000) : 1,
  };
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase.rpc("get_dashboard_stats");
  if (error) throw new Error(`Could not load dashboard statistics: ${error.message}`);
  const stats = (data ?? {}) as Partial<Record<keyof DashboardStats, number>>;
  return {
    total_products: Number(stats.total_products ?? 0),
    published_products: Number(stats.published_products ?? 0),
    draft_products: Number(stats.draft_products ?? 0),
    available_products: Number(stats.available_products ?? 0),
    booked_products: Number(stats.booked_products ?? 0),
    total_categories: Number(stats.total_categories ?? 0),
  };
}

export async function listAdminProducts(
  filters: AdminProductFilters,
  pageSize = ADMIN_PAGE_SIZE,
): Promise<{ items: AdminProduct[]; total: number; page: number; pageCount: number }> {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase.rpc("search_products", {
    p_query: filters.q || null,
    p_category_slug: filters.category || null,
    p_status: filters.status === "all" ? null : filters.status,
    p_publication: filters.publication,
    p_sort: "newest",
    p_limit: pageSize,
    p_offset: (filters.page - 1) * pageSize,
  });
  if (error) throw new Error(`Could not load products: ${error.message}`);

  const rows = data ?? [];
  const total = rows.length > 0 ? Number(rows[0].total_count) : 0;
  return {
    items: rows.map(searchRowToAdminProduct),
    total,
    page: filters.page,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getAdminProduct(id: string): Promise<AdminProduct | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase
    .from("products")
    .select("*, category:categories(name, slug)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Could not load product: ${error.message}`);
  if (!data) return null;

  return {
    id: data.id,
    product_code: data.product_code,
    name: data.name,
    slug: data.slug,
    description: data.description,
    price: toNumberOrNull(data.price),
    category_id: data.category_id,
    category_name: data.category?.name ?? null,
    category_slug: data.category?.slug ?? null,
    image_url: data.image_url,
    image_path: data.image_path,
    status: data.status,
    is_published: data.is_published,
    is_new_arrival: data.is_new_arrival,
    version: data.version,
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
}

export async function getAdminCategories(): Promise<CategoryWithCount[]> {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase.rpc("get_categories_with_counts");
  if (error) throw new Error(`Could not load categories: ${error.message}`);
  return (data ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    created_at: c.created_at,
    product_count: Number(c.product_count) || 0,
  }));
}

export async function getAdminSettings(): Promise<SiteSettings & { updatedAt: string | null }> {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase
    .from("admin_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();
  if (error) throw new Error(`Could not load settings: ${error.message}`);
  return { ...settingsRowToSettings(data), updatedAt: data?.updated_at ?? null };
}
