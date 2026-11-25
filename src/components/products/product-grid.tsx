import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { ProductCardData } from "@/types";
import { ProductCard } from "./product-card";

export const GRID_CLASSES = "grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 lg:gap-6";

export function ProductGrid({
  products,
  currency,
  priorityCount = 0,
  className,
}: {
  products: ProductCardData[];
  currency: string;
  priorityCount?: number;
  className?: string;
}) {
  return (
    <ul className={cn(GRID_CLASSES, className)} role="list">
      {products.map((product, index) => (
        <li key={product.id} className="min-w-0">
          <ProductCard product={product} currency={currency} priority={index < priorityCount} />
        </li>
      ))}
    </ul>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border/70 bg-card">
      <Skeleton className="aspect-square w-full rounded-none" />
      <div className="space-y-2 p-3 sm:p-4">
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-5 w-1/3" />
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  );
}

export function ProductGridSkeleton({ count = 8, className }: { count?: number; className?: string }) {
  return (
    <div className={cn(GRID_CLASSES, className)} aria-busy="true" aria-label="Loading products">
      {Array.from({ length: count }, (_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}
