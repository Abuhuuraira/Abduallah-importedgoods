import Image from "next/image";
import Link from "next/link";
import { Heart } from "lucide-react";
import { NewArrivalBadge, PublicationBadge, StatusBadge } from "@/components/products/badges";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate, formatPrice } from "@/lib/format";
import type { AdminProduct } from "@/types";
import { ProductRowActions } from "./product-row-actions";

function Likes({ count }: { count: number }) {
  return (
    <span className="inline-flex items-center gap-1 tabular-nums" title={`${count} ${count === 1 ? "like" : "likes"}`} data-testid="product-likes">
      <Heart className={count > 0 ? "size-3.5 fill-rose-500 text-rose-500" : "size-3.5 text-muted-foreground"} aria-hidden="true" />
      {count}
      <span className="sr-only">{count === 1 ? " like" : " likes"}</span>
    </span>
  );
}

export function AdminProductList({
  products,
  currency,
  likes,
}: {
  products: AdminProduct[];
  currency: string;
  /** product id → like count; the column is hidden when not provided. */
  likes?: Record<string, number>;
}) {
  return (
    <>
      {/* Phones & tablets: cards */}
      <ul className="space-y-3 lg:hidden" role="list">
        {products.map((p) => (
          <li key={p.id} className="rounded-2xl border border-border/70 bg-card p-3 shadow-soft">
            <div className="flex gap-3">
              <Link
                href={`/admin/products/${p.id}/edit`}
                className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-surface"
                aria-label={`Edit ${p.name}`}
              >
                <Image src={p.image_url} alt="" fill sizes="80px" className="object-cover" />
              </Link>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-muted-foreground">{p.product_code}</p>
                <Link href={`/admin/products/${p.id}/edit`} className="line-clamp-2 font-semibold leading-snug hover:underline">
                  {p.name}
                </Link>
                <p className="mt-0.5 text-sm font-bold">{formatPrice(p.price, currency)}</p>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  <StatusBadge status={p.status} />
                  <PublicationBadge published={p.is_published} />
                  {p.is_new_arrival && <NewArrivalBadge />}
                </div>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-3">
              <p className="min-w-0 truncate text-xs text-muted-foreground">
                {p.category_name ?? "Uncategorized"} · {formatDate(p.created_at)}
                {likes && (
                  <>
                    {" · "}
                    <Likes count={likes[p.id] ?? 0} />
                  </>
                )}
              </p>
              <ProductRowActions product={p} />
            </div>
          </li>
        ))}
      </ul>

      {/* Desktop: table */}
      <div className="hidden overflow-hidden rounded-2xl border border-border/70 bg-card shadow-soft lg:block">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="w-16 pl-4">Image</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Category</TableHead>
              {likes && <TableHead>Likes</TableHead>}
              <TableHead>Availability</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="pr-4 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="pl-4">
                  <div className="relative size-12 overflow-hidden rounded-lg bg-surface">
                    <Image src={p.image_url} alt="" fill sizes="48px" className="object-cover" />
                  </div>
                </TableCell>
                <TableCell className="max-w-64">
                  <Link href={`/admin/products/${p.id}/edit`} className="block truncate font-semibold hover:underline">
                    {p.name}
                  </Link>
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    {p.product_code}
                    {p.is_new_arrival && <NewArrivalBadge className="scale-90" />}
                  </span>
                </TableCell>
                <TableCell className="font-semibold whitespace-nowrap">{formatPrice(p.price, currency)}</TableCell>
                <TableCell className="text-muted-foreground">{p.category_name ?? "—"}</TableCell>
                {likes && (
                  <TableCell>
                    <Likes count={likes[p.id] ?? 0} />
                  </TableCell>
                )}
                <TableCell>
                  <StatusBadge status={p.status} />
                </TableCell>
                <TableCell>
                  <PublicationBadge published={p.is_published} />
                </TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">{formatDate(p.created_at)}</TableCell>
                <TableCell className="pr-4">
                  <ProductRowActions product={p} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
