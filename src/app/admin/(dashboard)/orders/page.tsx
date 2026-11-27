import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardList, Search } from "lucide-react";
import { FeatureNotInstalled, OrderCard } from "@/components/admin/orders/order-parts";
import { PageHeader } from "@/components/admin/page-header";
import { Pagination } from "@/components/admin/pagination";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requireAdmin } from "@/lib/auth";
import { getAdminSettings, getOrderCounts, listOrders, parseOrderFilters } from "@/lib/data/admin";
import { ORDER_STATUS_LABELS, ORDER_STATUSES, type OrderStatus } from "@/lib/orders";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Orders" };

const TABS: (OrderStatus | "all")[] = ["all", ...ORDER_STATUSES];

export default async function OrdersPage({ searchParams }: PageProps<"/admin/orders">) {
  await requireAdmin();
  const filters = parseOrderFilters(await searchParams);
  const [list, counts, settings] = await Promise.all([listOrders(filters), getOrderCounts(), getAdminSettings()]);

  const header = (
    <PageHeader
      title="Orders"
      description="Cash-on-delivery orders from your website. Open an order to confirm it with the customer on WhatsApp."
    />
  );
  if (!list.installed || !counts.installed) {
    return (
      <>
        {header}
        <FeatureNotInstalled feature="orders and likes" />
      </>
    );
  }

  const hrefFor = (status: OrderStatus | "all", page = 1, q = filters.q) => {
    const params = new URLSearchParams();
    if (status !== "all") params.set("status", status);
    if (q) params.set("q", q);
    if (page > 1) params.set("page", String(page));
    const qs = params.toString();
    return qs ? `/admin/orders?${qs}` : "/admin/orders";
  };

  const { items, total, pageCount } = list.data;

  return (
    <>
      {header}

      <nav aria-label="Order status" className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        {TABS.map((tab) => {
          const active = filters.status === tab;
          const count = counts.data[tab];
          return (
            <Link
              key={tab}
              href={hrefFor(tab, 1)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-10 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors",
                active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:bg-muted",
              )}
            >
              {tab === "all" ? "All" : ORDER_STATUS_LABELS[tab]}
              <span
                className={cn(
                  "min-w-6 rounded-full px-1.5 text-center text-xs font-bold tabular-nums",
                  active ? "bg-white/20" : tab === "new" && count > 0 ? "bg-gold text-gold-foreground" : "bg-muted",
                )}
              >
                {count}
              </span>
            </Link>
          );
        })}
      </nav>

      <form action="/admin/orders" method="get" role="search" className="mb-5 flex gap-2">
        {filters.status !== "all" && <input type="hidden" name="status" value={filters.status} />}
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            type="search"
            name="q"
            defaultValue={filters.q}
            placeholder="Search order no., name, phone or product"
            aria-label="Search orders"
            className="h-11 pl-9"
          />
        </div>
        <Button type="submit" size="lg" variant="outline" className="h-11">
          Search
        </Button>
      </form>

      {items.length === 0 ? (
        filters.q || filters.status !== "all" ? (
          <EmptyState icon={ClipboardList} title="No orders match" description="Try another search or status.">
            <Button asChild variant="outline">
              <Link href="/admin/orders">Show all orders</Link>
            </Button>
          </EmptyState>
        ) : (
          <EmptyState
            icon={ClipboardList}
            title="No orders yet"
            description="When a customer taps “Order now · Cash on Delivery” on a product, the order appears here and you get a notification."
          />
        )
      ) : (
        <>
          <p className="mb-3 text-sm text-muted-foreground">
            {total} order{total === 1 ? "" : "s"}
            {filters.q ? ` matching “${filters.q}”` : ""}
          </p>
          <ul className="grid gap-3 lg:grid-cols-2" role="list">
            {items.map((order) => (
              <OrderCard key={order.id} order={order} currency={settings.currency} />
            ))}
          </ul>
          <Pagination page={filters.page} pageCount={pageCount} hrefFor={(p) => hrefFor(filters.status, p)} />
        </>
      )}
    </>
  );
}
