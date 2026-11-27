import "server-only";

import {
  isAnalyticsNotInstalled,
  parseVisitorLive,
  parseVisitorStats,
  type VisitorLive,
  type VisitorStats,
} from "@/lib/analytics";
import { requireAdmin } from "@/lib/auth";
import {
  isOrderStatus,
  parseOrder,
  parseOrderCounts,
  type Order,
  type OrderCounts,
  type OrderStatus,
} from "@/lib/orders";
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

/** Result of a visitor-statistics read: "not installed" until the SQL file is run. */
export type AnalyticsResult<T> = { installed: true; data: T } | { installed: false };

export async function getVisitorLive(): Promise<AnalyticsResult<VisitorLive>> {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase.rpc("get_visitor_live");
  if (isAnalyticsNotInstalled(error)) return { installed: false };
  if (error) throw new Error(`Could not load live visitors: ${error.message}`);
  return { installed: true, data: parseVisitorLive(data) };
}

export async function getVisitorStats(days: number): Promise<AnalyticsResult<VisitorStats>> {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase.rpc("get_visitor_stats", { p_days: days });
  if (isAnalyticsNotInstalled(error)) return { installed: false };
  if (error) throw new Error(`Could not load visitor statistics: ${error.message}`);
  return { installed: true, data: parseVisitorStats(data) };
}

// ---------------------------------------------------------------------------
// Orders, likes and notification devices (SQL file 6)
// ---------------------------------------------------------------------------

export type OrderFilters = { status: OrderStatus | "all"; q: string; page: number };

export function parseOrderFilters(params: RawSearchParams): OrderFilters {
  const status = first(params.status);
  const page = Number.parseInt(first(params.page), 10);
  return {
    status: isOrderStatus(status) ? status : "all",
    q: first(params.q).trim().slice(0, 100),
    page: Number.isFinite(page) && page > 0 ? Math.min(page, 10_000) : 1,
  };
}

export async function listOrders(
  filters: OrderFilters,
  pageSize = ADMIN_PAGE_SIZE,
): Promise<AnalyticsResult<{ items: Order[]; total: number; pageCount: number }>> {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase.rpc("admin_list_orders", {
    p_status: filters.status,
    p_query: filters.q || null,
    p_limit: pageSize,
    p_offset: (filters.page - 1) * pageSize,
  });
  if (isAnalyticsNotInstalled(error)) return { installed: false };
  if (error) throw new Error(`Could not load orders: ${error.message}`);
  const rows = data ?? [];
  const total = rows.length > 0 ? Number(rows[0].total_count) : 0;
  return {
    installed: true,
    data: { items: rows.map(parseOrder), total, pageCount: Math.max(1, Math.ceil(total / pageSize)) },
  };
}

export async function getOrderCounts(): Promise<AnalyticsResult<OrderCounts>> {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase.rpc("admin_order_counts");
  if (isAnalyticsNotInstalled(error)) return { installed: false };
  if (error) throw new Error(`Could not load order counts: ${error.message}`);
  return { installed: true, data: parseOrderCounts(data) };
}

export type OrderDetail = {
  order: Order;
  product: { id: string; status: "available" | "booked"; isPublished: boolean; slug: string } | null;
};

export async function getOrder(id: string): Promise<OrderDetail | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase.rpc("admin_get_order", { p_id: id });
  if (isAnalyticsNotInstalled(error)) return null;
  if (error) throw new Error(`Could not load the order: ${error.message}`);
  if (!data || typeof data !== "object") return null;
  const d = data as { order?: unknown; product?: Record<string, unknown> | null };
  const p = d.product;
  return {
    order: parseOrder(d.order),
    product:
      p && typeof p.id === "string"
        ? {
            id: p.id,
            status: p.status === "booked" ? "booked" : "available",
            isPublished: p.is_published === true,
            slug: String(p.slug ?? ""),
          }
        : null,
  };
}

export type LikeStats = {
  total: number;
  today: number;
  top: { id: string; name: string; productCode: string; imageUrl: string; status: string; likes: number }[];
};

export async function getLikeStats(): Promise<AnalyticsResult<LikeStats>> {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase.rpc("admin_like_stats");
  if (isAnalyticsNotInstalled(error)) return { installed: false };
  if (error) throw new Error(`Could not load likes: ${error.message}`);
  const d = (data ?? {}) as { total?: unknown; today?: unknown; top?: unknown };
  return {
    installed: true,
    data: {
      total: Number(d.total) || 0,
      today: Number(d.today) || 0,
      top: (Array.isArray(d.top) ? d.top : []).map((t: Record<string, unknown>) => ({
        id: String(t.id ?? ""),
        name: String(t.name ?? ""),
        productCode: String(t.product_code ?? ""),
        imageUrl: String(t.image_url ?? ""),
        status: String(t.status ?? ""),
        likes: Number(t.likes) || 0,
      })),
    },
  };
}

/** product id → number of likes (missing = 0). Empty when SQL file 6 is not installed. */
export async function getProductLikeCounts(productIds: string[]): Promise<Record<string, number>> {
  if (productIds.length === 0) return {};
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase.rpc("admin_product_like_counts", { p_product_ids: productIds });
  if (error) {
    if (!isAnalyticsNotInstalled(error)) console.error("[admin] like counts failed:", error.message);
    return {};
  }
  return Object.fromEntries((data ?? []).map((r) => [r.product_id, Number(r.likes) || 0]));
}

export type PushDevice = { endpoint: string; label: string; notifyOrders: boolean; notifyLikes: boolean; createdAt: string };

export async function listPushDevices(): Promise<AnalyticsResult<PushDevice[]>> {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase.rpc("admin_list_push_devices");
  if (isAnalyticsNotInstalled(error)) return { installed: false };
  if (error) throw new Error(`Could not load notification devices: ${error.message}`);
  return {
    installed: true,
    data: (data ?? []).map((d) => ({
      endpoint: d.endpoint,
      label: d.device_label,
      notifyOrders: d.notify_orders,
      notifyLikes: d.notify_likes,
      createdAt: d.created_at,
    })),
  };
}
