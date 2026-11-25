import Link from "next/link";
import { cn } from "@/lib/utils";
import type { CategoryWithCount } from "@/types";

/** Horizontally scrollable category filter chips (links to /products?category=…). */
export function CategoryChips({
  categories,
  activeSlug = "",
  className,
}: {
  categories: CategoryWithCount[];
  activeSlug?: string;
  className?: string;
}) {
  if (categories.length === 0) return null;
  const chip =
    "inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition-colors";

  return (
    <nav aria-label="Product categories" className={cn("-mx-4 sm:mx-0", className)}>
      <ul className="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-1 sm:flex-wrap sm:overflow-visible sm:px-0">
        <li>
          <Link
            href="/products"
            className={cn(
              chip,
              !activeSlug ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background hover:border-primary/40 hover:bg-muted",
            )}
          >
            All
          </Link>
        </li>
        {categories.map((c) => {
          const active = c.slug === activeSlug;
          return (
            <li key={c.slug}>
              <Link
                href={`/products?category=${c.slug}`}
                aria-current={active ? "page" : undefined}
                className={cn(
                  chip,
                  active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background hover:border-primary/40 hover:bg-muted",
                )}
              >
                {c.name}
                <span className={cn("text-xs", active ? "text-primary-foreground/70" : "text-muted-foreground")}>
                  {c.product_count}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
