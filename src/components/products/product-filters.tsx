"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CheckCircle2, Loader2, Search, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SORT_OPTIONS } from "@/lib/constants";
import { catalogHref } from "@/lib/search-params";
import { cn } from "@/lib/utils";
import type { ProductQuery, SortOption } from "@/types";

type CatalogFilters = Required<Pick<ProductQuery, "q" | "category" | "available" | "newArrivals" | "sort">>;

type ProductFiltersProps = {
  categories: { slug: string; name: string; product_count: number }[];
  current: CatalogFilters;
};

export function ProductFilters({ categories, current }: ProductFiltersProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [search, setSearch] = useState(current.q);
  // Keep the search box in sync when the URL changes (e.g. header search, back button).
  const [syncedQ, setSyncedQ] = useState(current.q);
  if (current.q !== syncedQ) {
    setSyncedQ(current.q);
    setSearch(current.q);
  }

  const hasFilters = Boolean(current.q || current.category || current.available || current.newArrivals || current.sort !== "newest");

  function apply(patch: Partial<CatalogFilters>) {
    const next = { ...current, ...patch };
    startTransition(() => {
      router.replace(catalogHref(next), { scroll: false });
    });
  }

  return (
    <div className="space-y-3 rounded-2xl border border-border/70 bg-card p-3 shadow-soft sm:p-4">
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          apply({ q: search.trim() });
        }}
        className="flex gap-2"
      >
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            type="search"
            name="q"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, product ID, description…"
            aria-label="Search products"
            maxLength={100}
            enterKeyHint="search"
            className="pl-9"
          />
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                if (current.q) apply({ q: "" });
              }}
              className="absolute top-1/2 right-2 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
        <Button type="submit" className="h-11 px-4 sm:px-5">
          {pending ? <Loader2 className="animate-spin" /> : <Search />}
          <span className="hidden sm:inline">Search</span>
        </Button>
      </form>

      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
        <Select value={current.category || "all"} onValueChange={(v) => apply({ category: v === "all" ? "" : v })}>
          <SelectTrigger className="w-full sm:w-56" aria-label="Filter by category">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent position="popper">
            <SelectItem value="all">All categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.slug} value={c.slug}>
                {c.name} ({c.product_count})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={current.sort} onValueChange={(v) => apply({ sort: v as SortOption })}>
          <SelectTrigger className="w-full sm:w-52" aria-label="Sort products">
            <SelectValue />
          </SelectTrigger>
          <SelectContent position="popper">
            {SORT_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <ToggleChip
          active={current.available}
          onClick={() => apply({ available: !current.available })}
          icon={<CheckCircle2 className="size-4" />}
        >
          Available only
        </ToggleChip>
        <ToggleChip
          active={current.newArrivals}
          onClick={() => apply({ newArrivals: !current.newArrivals })}
          icon={<Sparkles className="size-4" />}
        >
          New arrivals
        </ToggleChip>

        {hasFilters && (
          <Button
            type="button"
            variant="ghost"
            className="col-span-2 h-11 text-muted-foreground sm:col-span-1 sm:ml-auto"
            onClick={() => {
              setSearch("");
              apply({ q: "", category: "", available: false, newArrivals: false, sort: "newest" });
            }}
          >
            <X /> Clear filters
          </Button>
        )}
      </div>
      {pending && (
        <p className="flex items-center gap-2 text-xs text-muted-foreground" aria-live="polite">
          <Loader2 className="size-3.5 animate-spin" /> Updating results…
        </p>
      )}
    </div>
  );
}

function ToggleChip({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex h-11 items-center justify-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-input bg-background text-foreground hover:bg-muted",
      )}
    >
      {icon}
      {children}
    </button>
  );
}
