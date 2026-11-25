"use client";

import { useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { catalogQueryString } from "@/lib/search-params";
import type { ProductCardData, ProductListResult, ProductQuery } from "@/types";
import { ProductGrid } from "./product-grid";

type LoadMoreProductsProps = {
  initialItems: ProductCardData[];
  total: number;
  query: ProductQuery;
  currency: string;
  pageSize: number;
  priorityCount?: number;
};

/**
 * Shows the first page (rendered on the server) and appends more products
 * from /api/products when the visitor taps "Load more".
 * Give it a `key` that changes with the filters so it resets.
 */
export function LoadMoreProducts({
  initialItems,
  total,
  query,
  currency,
  pageSize,
  priorityCount = 4,
}: LoadMoreProductsProps) {
  const [items, setItems] = useState(initialItems);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(initialItems.length >= total);

  async function loadMore() {
    setLoading(true);
    setError(null);
    try {
      const qs = catalogQueryString(query, { offset: items.length, limit: pageSize });
      const res = await fetch(`/api/products?${qs}`, { headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error("Request failed");
      const data = (await res.json()) as ProductListResult;
      setItems((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        return [...prev, ...data.items.filter((p) => !seen.has(p.id))];
      });
      if (data.items.length < pageSize || items.length + data.items.length >= data.total) setDone(true);
    } catch {
      setError("Could not load more products. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  const shown = items.length;
  const knownTotal = Math.max(total, shown);

  return (
    <div className="space-y-6">
      <ProductGrid products={items} currency={currency} priorityCount={priorityCount} />

      <div className="flex flex-col items-center gap-3 text-center">
        <p className="text-sm text-muted-foreground" aria-live="polite">
          Showing <span className="font-semibold text-foreground">{shown}</span> of{" "}
          <span className="font-semibold text-foreground">{knownTotal}</span> product{knownTotal === 1 ? "" : "s"}
        </p>
        {error && (
          <p className="text-sm font-medium text-destructive" role="alert">
            {error}
          </p>
        )}
        {!done && (
          <Button size="lg" variant="outline" onClick={loadMore} disabled={loading} className="min-w-52">
            {loading ? (
              <>
                <Loader2 className="animate-spin" /> Loading…
              </>
            ) : error ? (
              <>
                <RefreshCw /> Try again
              </>
            ) : (
              "Load more products"
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
