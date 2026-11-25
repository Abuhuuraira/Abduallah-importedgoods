import { describe, expect, it } from "vitest";
import { currencyLabel, formatDate, formatPrice } from "@/lib/format";
import { catalogHref, catalogQueryString, parseCatalogParams } from "@/lib/search-params";
import { nextAvailableSlug, slugify } from "@/lib/slug";

describe("slugify", () => {
  it("creates SEO-friendly slugs", () => {
    expect(slugify("Imported Wireless Headphones")).toBe("imported-wireless-headphones");
    expect(slugify("  Steel Pots & Pans (Set of 3)  ")).toBe("steel-pots-and-pans-set-of-3");
    expect(slugify("Café Crème")).toBe("cafe-creme");
  });
  it("falls back when nothing usable remains (e.g. Urdu-only names)", () => {
    expect(slugify("موبائل", "product")).toBe("product");
  });
  it("limits length and never ends with a dash", () => {
    const slug = slugify("a ".repeat(100));
    expect(slug.length).toBeLessThanOrEqual(80);
    expect(slug.endsWith("-")).toBe(false);
  });
  it("matches the database slug constraint", () => {
    for (const name of ["Hello World", "A--B", "100% Cotton!", "x"]) {
      expect(slugify(name)).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    }
  });
  it("picks the next free slug", () => {
    expect(nextAvailableSlug("fan", [])).toBe("fan");
    expect(nextAvailableSlug("fan", ["fan"])).toBe("fan-2");
    expect(nextAvailableSlug("fan", ["fan", "fan-2", "fan-3"])).toBe("fan-4");
  });
});

describe("formatPrice", () => {
  it("formats PKR as Rs.", () => {
    expect(formatPrice(2500)).toBe("Rs. 2,500");
    expect(formatPrice(1250000, "PKR")).toBe("Rs. 1,250,000");
    expect(formatPrice(99.5, "pkr")).toBe("Rs. 99.5");
  });
  it("handles missing prices", () => {
    expect(formatPrice(null)).toBe("Price on request");
    expect(formatPrice(undefined)).toBe("Price on request");
  });
  it("uses other currency codes as-is", () => {
    expect(currencyLabel("USD")).toBe("USD");
    expect(formatPrice(10, "USD")).toBe("USD 10");
  });
  it("formats dates in Pakistan time", () => {
    // 23:30 UTC on 1 Jan is already 2 Jan in Pakistan (UTC+5)
    expect(formatDate("2026-01-01T23:30:00Z")).toBe("2 Jan 2026");
  });
});

describe("catalog search params", () => {
  it("parses and sanitizes filters", () => {
    expect(
      parseCatalogParams({ q: "  headphones ", category: "Electronics", available: "1", new: "1", sort: "price_asc" }),
    ).toEqual({ q: "headphones", category: "electronics", available: true, newArrivals: true, sort: "price_asc" });
  });
  it("ignores invalid values", () => {
    expect(parseCatalogParams({ category: "../etc", sort: "drop table", available: "yes" })).toEqual({
      q: "",
      category: "",
      available: false,
      newArrivals: false,
      sort: "newest",
    });
  });
  it("builds clean URLs", () => {
    expect(catalogHref({})).toBe("/products");
    expect(catalogHref({ sort: "newest" })).toBe("/products");
    expect(catalogQueryString({ q: "fan & cooler", category: "electronics", available: true })).toBe(
      "q=fan+%26+cooler&category=electronics&available=1",
    );
    expect(catalogQueryString({}, { offset: 12, limit: 12 })).toBe("offset=12&limit=12");
  });
  it("round-trips through URLSearchParams", () => {
    const filters = { q: "kettle", category: "kitchen-items", available: false, newArrivals: true, sort: "price_desc" as const };
    expect(parseCatalogParams(new URLSearchParams(catalogQueryString(filters)))).toEqual(filters);
  });
});
