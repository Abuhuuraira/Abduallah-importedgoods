import Image from "next/image";
import Link from "next/link";
import { ChevronRight, MapPin, Phone } from "lucide-react";
import { formatDateTime, formatPrice } from "@/lib/format";
import { displayPhone, formatOrderNumber, type Order, ORDER_STATUS_LABELS, type OrderStatus, orderTotal } from "@/lib/orders";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<OrderStatus, string> = {
  new: "bg-gold-soft text-gold-foreground ring-gold/40",
  confirmed: "bg-primary/10 text-primary ring-primary/20",
  shipped: "bg-sky-50 text-sky-800 ring-sky-200",
  delivered: "bg-success-soft text-success ring-success/25",
  cancelled: "bg-muted text-muted-foreground ring-border",
};

export function OrderStatusBadge({ status, className }: { status: OrderStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide ring-1 ring-inset",
        STATUS_STYLES[status],
        className,
      )}
      data-testid="order-status"
    >
      {status === "new" && <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />}
      {ORDER_STATUS_LABELS[status]}
    </span>
  );
}

export function OrderCard({ order, currency }: { order: Order; currency: string }) {
  const total = orderTotal(order);
  return (
    <li>
      <Link
        href={`/admin/orders/${order.id}`}
        className={cn(
          "block rounded-2xl border bg-card p-4 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lift",
          order.status === "new" ? "border-gold/60" : "border-border/70",
        )}
        data-testid="order-card"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="flex items-center gap-2">
            <span className="font-mono text-sm font-bold">{formatOrderNumber(order.orderNumber)}</span>
            <OrderStatusBadge status={order.status} />
          </p>
          <time dateTime={order.createdAt} className="text-xs text-muted-foreground">
            {formatDateTime(order.createdAt)}
          </time>
        </div>

        <div className="mt-3 flex gap-3">
          <div className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-surface">
            {order.productImageUrl && (
              <Image src={order.productImageUrl} alt="" fill sizes="64px" className="object-cover" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{order.productName}</p>
            <p className="text-xs text-muted-foreground">
              {order.productCode} · Qty {order.quantity}
            </p>
            <p className="mt-0.5 text-sm font-bold">
              {total === null ? "Price to confirm" : formatPrice(total, currency)}
              <span className="ml-1 text-xs font-normal text-muted-foreground">COD</span>
            </p>
          </div>
          <ChevronRight className="size-5 shrink-0 self-center text-muted-foreground" aria-hidden="true" />
        </div>

        <div className="mt-3 grid gap-1 border-t border-border pt-3 text-sm">
          <p className="font-semibold">{order.customerName}</p>
          <p className="flex items-center gap-1.5 text-muted-foreground">
            <Phone className="size-3.5 shrink-0" aria-hidden="true" /> {displayPhone(order.customerWhatsapp)}
          </p>
          <p className="flex items-start gap-1.5 text-muted-foreground">
            <MapPin className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            <span className="line-clamp-2 break-words">{order.customerAddress}</span>
          </p>
        </div>
      </Link>
    </li>
  );
}

export function FeatureNotInstalled({ feature }: { feature: string }) {
  return (
    <div className="rounded-2xl border border-amber-300 bg-amber-50 p-5 text-amber-950 sm:p-6" role="alert">
      <h2 className="text-lg font-bold">One more step to turn on {feature}</h2>
      <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm leading-relaxed">
        <li>Open your project at supabase.com → <strong>SQL Editor</strong> → <strong>New query</strong>.</li>
        <li>
          Open the file{" "}
          <code className="rounded bg-white px-1 py-0.5 text-xs">supabase/migrations/20261127000000_likes_orders_notifications.sql</code>,
          copy everything, paste it in and press <strong>Run</strong>.
        </li>
        <li>Come back here and reload the page.</li>
      </ol>
    </div>
  );
}
