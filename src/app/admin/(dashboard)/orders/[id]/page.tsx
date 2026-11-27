import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Check, ExternalLink, MapPin, MessageSquareText, Phone, User } from "lucide-react";
import { OrderActions, OrderNoteForm } from "@/components/admin/orders/order-actions";
import { OrderStatusBadge } from "@/components/admin/orders/order-parts";
import { requireAdmin } from "@/lib/auth";
import { getAdminSettings, getOrder } from "@/lib/data/admin";
import { formatDateTime, formatPrice } from "@/lib/format";
import {
  buildCustomerMessage,
  displayPhone,
  formatOrderNumber,
  ORDER_STATUS_LABELS,
  type OrderStatus,
  orderTotal,
} from "@/lib/orders";
import { productPath } from "@/lib/site";
import { cn } from "@/lib/utils";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

export const metadata: Metadata = { title: "Order" };

const FLOW: OrderStatus[] = ["new", "confirmed", "shipped", "delivered"];

function Card({ title, icon: Icon, children }: { title: string; icon: typeof User; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border/70 bg-card p-4 shadow-soft sm:p-5">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
        <Icon className="size-4" aria-hidden="true" /> {title}
      </h2>
      {children}
    </section>
  );
}

export default async function OrderPage({ params }: PageProps<"/admin/orders/[id]">) {
  await requireAdmin();
  const { id } = await params;
  const [detail, settings] = await Promise.all([getOrder(id), getAdminSettings()]);
  if (!detail) notFound();

  const { order, product } = detail;
  const label = formatOrderNumber(order.orderNumber);
  const total = orderTotal(order);
  const message = buildCustomerMessage(order, settings.businessName, settings.currency);
  const step = FLOW.indexOf(order.status);

  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/admin/orders" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden="true" /> All orders
      </Link>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex flex-wrap items-center gap-3 text-2xl font-bold sm:text-3xl">
            <span className="font-mono">{label}</span>
            <OrderStatusBadge status={order.status} className="text-sm" />
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Placed {formatDateTime(order.createdAt)} · Cash on delivery
          </p>
        </div>
      </div>

      {/* Progress */}
      {order.status === "cancelled" ? (
        <p className="mb-6 rounded-2xl border border-border bg-muted/60 p-4 text-sm text-muted-foreground">
          This order was cancelled. You can reopen it if the customer still wants it.
        </p>
      ) : (
        <ol className="mb-6 grid grid-cols-4 gap-2" aria-label="Order progress">
          {FLOW.map((s, i) => (
            <li key={s} className="text-center" aria-current={i === step ? "step" : undefined}>
              <span
                className={cn(
                  "mx-auto flex size-8 items-center justify-center rounded-full text-xs font-bold",
                  i <= step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                )}
              >
                {i < step ? <Check className="size-4" aria-hidden="true" /> : i + 1}
              </span>
              <span className={cn("mt-1 block text-xs", i === step ? "font-bold" : "text-muted-foreground")}>
                {ORDER_STATUS_LABELS[s]}
              </span>
            </li>
          ))}
        </ol>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <Card title="Customer" icon={User}>
            <p className="text-lg font-bold" data-testid="customer-name">{order.customerName}</p>
            <p className="mt-2 flex items-center gap-2 text-sm">
              <Phone className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <a href={`tel:+${order.customerWhatsapp}`} className="font-semibold hover:underline" data-testid="customer-phone">
                {displayPhone(order.customerWhatsapp)}
              </a>
            </p>
            <p className="mt-2 flex items-start gap-2 text-sm">
              <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <span className="whitespace-pre-line break-words" data-testid="customer-address">{order.customerAddress}</span>
            </p>
            {order.customerNote && (
              <p className="mt-3 rounded-xl bg-surface p-3 text-sm">
                <span className="block text-xs font-semibold text-muted-foreground">Customer note</span>
                <span className="whitespace-pre-line break-words">{order.customerNote}</span>
              </p>
            )}
          </Card>

          <Card title="Product" icon={ExternalLink}>
            <div className="flex gap-3">
              <div className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-surface">
                {order.productImageUrl && <Image src={order.productImageUrl} alt="" fill sizes="80px" className="object-cover" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{order.productName}</p>
                <p className="text-xs text-muted-foreground">{order.productCode}</p>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                  <span>Price: <strong>{formatPrice(order.unitPrice, settings.currency)}</strong></span>
                  <span>Qty: <strong>{order.quantity}</strong></span>
                </div>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
              <span className="text-sm text-muted-foreground">Total to collect (cash)</span>
              <span className="text-xl font-extrabold" data-testid="order-total-admin">
                {total === null ? "Price to confirm" : formatPrice(total, settings.currency)}
              </span>
            </div>
            {product ? (
              <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                <Link href={`/admin/products/${product.id}/edit`} className="font-semibold text-primary hover:underline">
                  Edit product
                </Link>
                {product.isPublished && (
                  <a href={productPath(product.slug)} target="_blank" rel="noreferrer" className="font-semibold text-primary hover:underline">
                    View on website
                  </a>
                )}
                <span className="text-muted-foreground">
                  Now: {product.status === "booked" ? "Booked" : "Available"}
                </span>
              </p>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">This product has since been deleted.</p>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card title="Next step" icon={Check}>
            <OrderActions
              orderId={order.id}
              orderNumber={order.orderNumber}
              status={order.status}
              customerWhatsappUrl={buildWhatsAppUrl(order.customerWhatsapp, message)}
              product={product ? { id: product.id, status: product.status, code: order.productCode } : null}
            />
          </Card>
          <Card title="Private note" icon={MessageSquareText}>
            <OrderNoteForm orderId={order.id} initialNote={order.adminNote} />
          </Card>
        </div>
      </div>
    </div>
  );
}
