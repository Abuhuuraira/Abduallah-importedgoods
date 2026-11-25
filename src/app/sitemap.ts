import type { MetadataRoute } from "next";
import { getCategories, getPublishedProductSlugs } from "@/lib/data/public";
import { getSiteUrl, productPath } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl();
  // Supabase returns at most 1,000 rows per request by default — plenty for a catalog sitemap.
  const [products, categories] = await Promise.all([getPublishedProductSlugs(1000), getCategories()]);

  return [
    { url: `${base}/`, changeFrequency: "daily", priority: 1 },
    { url: `${base}/products`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/products?new=1`, changeFrequency: "daily", priority: 0.7 },
    ...categories
      .filter((c) => c.product_count > 0)
      .map((c) => ({
        url: `${base}/products?category=${c.slug}`,
        changeFrequency: "weekly" as const,
        priority: 0.6,
      })),
    ...products.map((p) => ({
      url: `${base}${productPath(p.slug)}`,
      lastModified: p.updated_at,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
