import type { ProductQuery, SortOption } from "@/types";

type RawParams = Record<string, string | string[] | undefined> | URLSearchParams;

function read(params: RawParams, key: string): string {
  if (params instanceof URLSearchParams) return params.get(key) ?? "";
  const value = params[key];
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

const SORTS: SortOption[] = ["newest", "oldest", "price_asc", "price_desc"];

/** Reads the public catalog filters from the URL (?q=&category=&available=1&new=1&sort=). */
export function parseCatalogParams(params: RawParams): Required<Pick<ProductQuery, "q" | "category" | "available" | "newArrivals" | "sort">> {
  const sort = read(params, "sort") as SortOption;
  const category = read(params, "category").toLowerCase();
  return {
    q: read(params, "q").trim().slice(0, 100),
    category: /^[a-z0-9]+(-[a-z0-9]+)*$/.test(category) ? category : "",
    available: read(params, "available") === "1",
    newArrivals: read(params, "new") === "1",
    sort: SORTS.includes(sort) ? sort : "newest",
  };
}

/** Builds the query string for /products (omits defaults to keep URLs clean). */
export function catalogQueryString(query: ProductQuery, extra?: Record<string, string | number>): string {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.category) params.set("category", query.category);
  if (query.available) params.set("available", "1");
  if (query.newArrivals) params.set("new", "1");
  if (query.sort && query.sort !== "newest") params.set("sort", query.sort);
  if (extra) for (const [k, v] of Object.entries(extra)) params.set(k, String(v));
  return params.toString();
}

export function catalogHref(query: ProductQuery): string {
  const qs = catalogQueryString(query);
  return qs ? `/products?${qs}` : "/products";
}
