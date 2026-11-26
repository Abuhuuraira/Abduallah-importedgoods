import type { Metadata } from "next";
import Link from "next/link";
import {
  CheckCircle2,
  ExternalLink,
  FileEdit,
  Globe,
  Layers,
  Lock,
  Package,
  PlusCircle,
  Settings,
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
import { getAdminSettings, getDashboardStats, getVisitorLive, listAdminProducts } from "@/lib/data/admin";
import { isValidWhatsAppNumber } from "@/lib/whatsapp";

export const metadata: Metadata = { title: "Dashboard" };

export default async function AdminDashboardPage() {
  const { user } = await requireAdmin();
  const [stats, recent, settings, visitors] = await Promise.all([
    getDashboardStats(),
    listAdminProducts({ q: "", category: "", status: "all", publication: "all", page: 1 }, 5),
    getAdminSettings(),
    // Visitor numbers are a bonus: never let them break the dashboard.
    getVisitorLive().catch((error: unknown) => {
      console.error("[admin] Visitor statistics unavailable:", error);
      return null;
    }),
  ]);

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
          <AdminProductList products={recent.items} currency={settings.currency} />
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
