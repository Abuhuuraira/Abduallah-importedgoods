/**
 * Turns a name into a URL-friendly slug:
 * "Imported Wireless Headphones (Black)" → "imported-wireless-headphones-black"
 */
export function slugify(input: string, fallback = "item"): string {
  const slug = input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
  return slug || fallback;
}

/**
 * Picks the first free slug: "base", "base-2", "base-3", ...
 * `taken` is the list of existing slugs that start with `base`.
 */
export function nextAvailableSlug(base: string, taken: string[]): string {
  const used = new Set(taken);
  if (!used.has(base)) return base;
  for (let i = 2; i < 10_000; i++) {
    const candidate = `${base}-${i}`;
    if (!used.has(candidate)) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`;
}
