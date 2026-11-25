/**
 * Absolute base URL of the website, used for WhatsApp product links,
 * canonical URLs, Open Graph tags and the sitemap.
 *
 * Priority:
 * 1. NEXT_PUBLIC_SITE_URL (set this to your real domain in production)
 * 2. Vercel's production domain (set automatically on Vercel)
 * 3. http://localhost:3000 for local development
 */
export function getSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");

  const vercelProduction = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercelProduction) return `https://${vercelProduction.replace(/\/+$/, "")}`;

  return "http://localhost:3000";
}

export function absoluteUrl(path: string): string {
  return `${getSiteUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}

export function productPath(slug: string): string {
  return `/products/${encodeURIComponent(slug)}`;
}
