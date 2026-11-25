"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { AdminProductFilters as Filters } from "@/lib/data/admin";

type Props = {
  categories: { slug: string; name: string }[];
  current: Filters;
};

function toHref(f: Omit<Filters, "page">) {
  const params = new URLSearchParams();
  if (f.q) params.set("q", f.q);
  if (f.category) params.set("category", f.category);
  if (f.status !== "all") params.set("status", f.status);
  if (f.publication !== "all") params.set("publication", f.publication);
  const qs = params.toString();
  return qs ? `/admin/products?${qs}` : "/admin/products";
}

export function AdminProductFilters({ categories, current }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [search, setSearch] = useState(current.q);
  // Keep the search box in sync when the URL changes (e.g. back button, "Clear filters" link).
  const [syncedQ, setSyncedQ] = useState(current.q);
  if (current.q !== syncedQ) {
    setSyncedQ(current.q);
    setSearch(current.q);
  }
  const active = Boolean(current.q || current.category || current.status !== "all" || current.publication !== "all");

  function apply(patch: Partial<Filters>) {
    const next = { ...current, ...patch };
    startTransition(() => router.replace(toHref(next), { scroll: false }));
  }

  return (
    <div className="mb-5 space-y-3 rounded-2xl border border-border/70 bg-card p-3 shadow-soft sm:p-4">
      <form
        role="search"
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          apply({ q: search.trim() });
        }}
      >
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, product ID (AIG-001), description…"
            aria-label="Search products"
            className="pl-9"
            maxLength={100}
          />
        </div>
        <Button type="submit" className="h-11">
          {pending ? <Loader2 className="animate-spin" /> : <Search />}
          <span className="hidden sm:inline">Search</span>
        </Button>
      </form>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:grid-cols-[1fr_1fr_1fr_auto]">
        <Select value={current.category || "all"} onValueChange={(v) => apply({ category: v === "all" ? "" : v })}>
          <SelectTrigger className="w-full" aria-label="Category">
            <SelectValue />
          </SelectTrigger>
          <SelectContent position="popper">
            <SelectItem value="all">All categories</SelectItem>
            <SelectItem value="__none__">Uncategorized</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.slug} value={c.slug}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={current.status} onValueChange={(v) => apply({ status: v as Filters["status"] })}>
          <SelectTrigger className="w-full" aria-label="Availability">
            <SelectValue />
          </SelectTrigger>
          <SelectContent position="popper">
            <SelectItem value="all">Any availability</SelectItem>
            <SelectItem value="available">Available</SelectItem>
            <SelectItem value="booked">Booked</SelectItem>
          </SelectContent>
        </Select>

        <Select value={current.publication} onValueChange={(v) => apply({ publication: v as Filters["publication"] })}>
          <SelectTrigger className="w-full" aria-label="Publication status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent position="popper">
            <SelectItem value="all">Published &amp; drafts</SelectItem>
            <SelectItem value="published">Published only</SelectItem>
            <SelectItem value="draft">Drafts only</SelectItem>
          </SelectContent>
        </Select>

        {active && (
          <Button
            type="button"
            variant="ghost"
            className="h-11 text-muted-foreground"
            onClick={() => {
              setSearch("");
              apply({ q: "", category: "", status: "all", publication: "all" });
            }}
          >
            <X /> Clear
          </Button>
        )}
      </div>
    </div>
  );
}
