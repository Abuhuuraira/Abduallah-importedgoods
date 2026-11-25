import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { formatPrice } from "@/lib/format";
import { productPath } from "@/lib/site";
import { cn } from "@/lib/utils";
import type { ProductCardData } from "@/types";
import { NewArrivalBadge, StatusBadge } from "./badges";

export const PRODUCT_GRID_SIZES = "(min-width: 1280px) 300px, (min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw";

type ProductCardProps = {
  product: ProductCardData;
  currency: string;
  priority?: boolean;
  className?: string;
};

export function ProductCard({ product, currency, priority = false, className }: ProductCardProps) {
  const href = productPath(product.slug);
  const booked = product.status === "booked";

  return (
    <article
      className={cn(
        "group relative flex min-w-0 flex-col overflow-hidden rounded-2xl border border-border/70 bg-card shadow-soft transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift",
        className,
      )}
    >
      <Link
        href={href}
        tabIndex={-1}
        aria-hidden="true"
        className="relative block aspect-square overflow-hidden bg-surface"
      >
        <Image
          src={product.image_url}
          alt=""
          fill
          sizes={PRODUCT_GRID_SIZES}
          loading={priority ? "eager" : "lazy"}
          className={cn(
            "object-cover transition-transform duration-500 group-hover:scale-[1.04]",
            booked && "opacity-70 grayscale-[60%]",
          )}
        />
        <span className="absolute inset-x-2 top-2 flex flex-wrap items-start justify-between gap-1">
          {product.is_new_arrival ? <NewArrivalBadge /> : <span />}
          <StatusBadge status={product.status} />
        </span>
        {booked && (
          <span className="absolute inset-x-0 bottom-0 bg-booked/90 py-1 text-center text-[0.7rem] font-bold uppercase tracking-[0.2em] text-white">
            Booked
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-1.5 p-3 sm:p-4">
        <p className="truncate text-[0.68rem] font-medium uppercase tracking-wider text-muted-foreground">
          {product.category_name ? `${product.category_name} · ` : ""}
          {product.product_code}
        </p>
        <h3 className="line-clamp-2 min-h-[2.5em] text-sm font-semibold leading-snug text-foreground sm:text-[0.95rem]">
          <Link href={href} className="outline-none after:absolute after:inset-0 after:content-[''] focus-visible:underline">
            {product.name}
          </Link>
        </h3>
        <p className={cn("text-base font-bold sm:text-lg", product.price === null ? "text-muted-foreground text-sm sm:text-sm" : "text-foreground")}>
          {formatPrice(product.price, currency)}
        </p>
        <span
          aria-hidden="true"
          className="mt-1 inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-border bg-background text-sm font-medium text-foreground transition-colors group-hover:border-primary group-hover:bg-primary group-hover:text-primary-foreground"
        >
          View Details
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </article>
  );
}
