import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  FileEdit,
  Heart,
  Globe,
  Layers,
  Lock,
  Package,
  PlusCircle,
  Settings,
  ShoppingBag,
  TriangleAlert,
  Users,
} from "lucide-react";
import { AdminProductList } from "@/components/admin/admin-product-list";
import { PageHeader } from "@/components/admin/page-header";
import { StatCard } from "@/components/admin/stat-card";
import { LiveVisitorsSummary } from "@/components/admin/visitors/live-visitors";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth";
import {
  getAdminSettings,
  getDashboardStats,
  getLikeStats,
  getOrderCounts,
  getProductLikeCounts,
  getVisitorLive,
  listAdminProducts,
} from "@/lib/data/admin";
import { formatCount } from "@/lib/format";
import { isValidWhatsAppNumber } from "@/lib/whatsapp";

export const metadata: Metadata = { title: "Dashboard" };

export default async function AdminDashboardPage() {
  const { user } = await requireAdmin();
  // Extras (visitors, orders, likes) must never break the dashboard.
  const optional = <T,>(promise: Promise<T>, what: string) =>
    promise.catch((error: unknown) => {
      console.error(`[admin] ${what} unavailable:`, error);
      return null;
    });
  const [stats, recent, settings, visitors, orderCounts, likeStats] = await Promise.all([
    getDashboardStats(),
    listAdminProducts({ q: "", category: "", status: "all", publication: "all", page: 1 }, 5),
    getAdminSettings(),
    optional(getVisitorLive(), "Visitor statistics"),
    optional(getOrderCounts(), "Orders"),
    optional(getLikeStats(), "Likes"),
  ]);
  const recentLikes = await getProductLikeCounts(recent.items.map((p) => p.id));

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={`Welcome back${user.email ? `, ${user.email}` : ""}. Here is your catalog at a glance.`}
        actions={
          <Button asChild size="lg">
            <Link href="/admin/products/new">
              <PlusCircle /> Add new product
            </Link>
          </Button>
        }
      />

      {!isValidWhatsAppNumber(settings.whatsappNumber) && (
        <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between" role="alert">
          <p className="flex gap-2">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            Your WhatsApp number is not set yet, so customers cannot book products. Add it in Settings.
          </p>
          <Button asChild size="sm" variant="outline" className="shrink-0 bg-white">
            <Link href="/admin/settings">
              <Settings /> Open settings
            </Link>
          </Button>
        </div>
      )}

      {visitors?.installed ? (
        <div className="mb-6">
          <LiveVisitorsSummary initial={visitors.data} />
        </div>
      ) : visitors ? (
        <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-border/70 bg-card p-4 text-sm shadow-soft sm:flex-row sm:items-center sm:justify-between">
          <p className="flex gap-2">
            <Users className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            Want to see how many people visit your website? Visitor statistics need a one-time setup.
          </p>
          <Button asChild size="sm" variant="outline" className="shrink-0">
            <Link href="/admin/visitors">Set up visitors</Link>
          </Button>
        </div>
      ) : null}

      {orderCounts?.installed && likeStats?.installed && (
        <section aria-label="Orders and likes" className="mb-6 grid gap-3 sm:gap-4 md:grid-cols-2">
          <Link
            href={orderCounts.data.new > 0 ? "/admin/orders?status=new" : "/admin/orders"}
            className="group block rounded-2xl border border-border/70 bg-card p-4 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lift sm:p-5"
            data-testid="dashboard-orders"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-medium text-muted-foreground">New orders</p>
              <span className="flex size-10 items-center justify-center rounded-xl bg-gold-soft text-gold-foreground">
                <ShoppingBag className="size-5" aria-hidden="true" />
              </span>
            </div>
            <p className="mt-1 text-3xl font-extrabold tracking-tight" data-testid="dashboard-new-orders">
              {formatCount(orderCounts.data.new)}
            </p>
            <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
              {formatCount(orderCounts.data.all)} order{orderCounts.data.all === 1 ? "" : "s"} in total ·{" "}
              {formatCount(orderCounts.data.confirmed + orderCounts.data.shipped)} in progress
              <ArrowRight className="ml-auto size-4 text-primary transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </p>
          </Link>

          <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-soft sm:p-5" data-testid="dashboard-likes">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-medium text-muted-foreground">Total likes</p>
              <span className="flex size-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                <Heart className="size-5" aria-hidden="true" />
              </span>
            </div>
            <p className="mt-1 text-3xl font-extrabold tracking-tight" data-testid="dashboard-total-likes">
              {formatCount(likeStats.data.total)}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{formatCount(likeStats.data.today)} today</p>
            {likeStats.data.top.length > 0 && (
              <ol className="mt-3 space-y-1.5 border-t border-border pt-3 text-sm">
                <li className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Most liked</li>
                {likeStats.data.top.slice(0, 3).map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3">
                    <Link href={`/admin/products/${p.id}/edit`} className="min-w-0 truncate hover:underline">
                      {p.name} <span className="text-xs text-muted-foreground">{p.productCode}</span>
                    </Link>
                    <span className="flex shrink-0 items-center gap-1 font-semibold tabular-nums">
                      <Heart className="size-3.5 fill-rose-500 text-rose-500" aria-hidden="true" /> {formatCount(p.likes)}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </section>
      )}

      <section aria-label="Statistics" className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        <StatCard label="Total Products" value={stats.total_products} icon={Package} tone="navy" href="/admin/products" />
        <StatCard label="Published" value={stats.published_products} icon={Globe} tone="green" href="/admin/products?publication=published" hint="Visible to customers" />
        <StatCard label="Drafts" value={stats.draft_products} icon={FileEdit} tone="slate" href="/admin/products?publication=draft" hint="Hidden from customers" />
        <StatCard label="Available" value={stats.available_products} icon={CheckCircle2} tone="green" href="/admin/products?status=available" />
        <StatCard label="Booked" value={stats.booked_products} icon={Lock} tone="red" href="/admin/products?status=booked" />
        <StatCard label="Categories" value={stats.total_categories} icon={Layers} tone="gold" href="/admin/categories" />
      </section>

      <section className="mt-8" aria-labelledby="recent-heading">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 id="recent-heading" className="text-lg font-bold sm:text-xl">Recently added</h2>
          <Link href="/admin/products" className="text-sm font-semibold text-primary hover:underline">
            Manage all products
          </Link>
        </div>
        {recent.items.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No products yet"
            description="Add your first product — upload a photo, set the price and publish it to your website."
          >
            <Button asChild>
              <Link href="/admin/products/new">
                <PlusCircle /> Add your first product
              </Link>
            </Button>
          </EmptyState>
        ) : (
          <AdminProductList products={recent.items} currency={settings.currency} likes={recentLikes} />
        )}
      </section>

      <section className="mt-8 grid gap-3 sm:grid-cols-3" aria-label="Quick links">
        {[
          { href: "/admin/categories", label: "Manage categories", icon: Layers },
          { href: "/admin/settings", label: "Business settings", icon: Settings },
          { href: "/", label: "View website", icon: ExternalLink, external: true },
        ].map(({ href, label, icon: Icon, external }) => (
          <Link
            key={href}
            href={href}
            target={external ? "_blank" : undefined}
            className="flex h-14 items-center gap-3 rounded-2xl border border-border/70 bg-card px-4 font-medium shadow-soft transition-colors hover:bg-muted"
          >
            <Icon className="size-5 text-muted-foreground" aria-hidden="true" />
            {label}
          </Link>
        ))}
      </section>
    </>
  );
}
