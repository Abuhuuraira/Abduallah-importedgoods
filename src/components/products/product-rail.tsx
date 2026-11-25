import type { ProductCardData } from "@/types";
import { ProductCard } from "./product-card";

/**
 * Swipeable row on phones, regular grid from tablets up.
 */
export function ProductRail({
  products,
  currency,
  priorityCount = 0,
}: {
  products: ProductCardData[];
  currency: string;
  priorityCount?: number;
}) {
  return (
    <ul
      role="list"
      className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:snap-none sm:grid-cols-3 sm:gap-4 sm:overflow-visible sm:px-0 lg:grid-cols-4 lg:gap-6"
    >
      {products.map((product, index) => (
        <li key={product.id} className="w-[46%] shrink-0 snap-start sm:w-auto">
          <ProductCard product={product} currency={currency} priority={index < priorityCount} />
        </li>
      ))}
    </ul>
  );
}
