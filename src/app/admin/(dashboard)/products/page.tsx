import type { Metadata } from "next";
import Link from "next/link";
import { PackageSearch, PlusCircle } from "lucide-react";
import { AdminProductFilters } from "@/components/admin/admin-product-filters";
import { AdminProductList } from "@/components/admin/admin-product-list";
import { PageHeader } from "@/components/admin/page-header";
import { Pagination } from "@/components/admin/pagination";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth";
import { getAdminCategories, getAdminSettings, listAdminProducts, parseAdminFilters } from "@/lib/data/admin";

export const metadata: Metadata = { title: "Products" };

export default async function AdminProductsPage({ searchParams }: PageProps<"/admin/products">) {
  await requireAdmin();
  const filters = parseAdminFilters(await searchParams);
  const [result, categories, settings] = await Promise.all([
    listAdminProducts(filters),
    getAdminCategories(),
    getAdminSettings(),
  ]);

  const hrefFor = (page: number) => {
    const params = new URLSearchParams();
    if (filters.q) params.set("q", filters.q);
    if (filters.category) params.set("category", filters.category);
    if (filters.status !== "all") params.set("status", filters.status);
    if (filters.publication !== "all") params.set("publication", filters.publication);
    if (page > 1) params.set("page", String(page));
    const qs = params.toString();
    return qs ? `/admin/products?${qs}` : "/admin/products";
  };

  const filtered = Boolean(filters.q || filters.category || filters.status !== "all" || filters.publication !== "all");

  return (
    <>
      <PageHeader
        title="Products"
        description={`${result.total} product${result.total === 1 ? "" : "s"}${filtered ? " match your filters" : " in your catalog"}. Tap “Mark Booked” when a customer books on WhatsApp.`}
        actions={
          <Button asChild size="lg">
            <Link href="/admin/products/new">
              <PlusCircle /> Add product
            </Link>
          </Button>
        }
      />

      <AdminProductFilters categories={categories} current={filters} />

      {result.items.length === 0 ? (
        filtered ? (
          <EmptyState icon={PackageSearch} title="No products match these filters" description="Try another search or clear the filters.">
            <Button asChild variant="outline">
              <Link href="/admin/products">Clear filters</Link>
            </Button>
          </EmptyState>
        ) : (
          <EmptyState icon={PackageSearch} title="No products yet" description="Add your first product to start building your catalog.">
            <Button asChild>
              <Link href="/admin/products/new">
                <PlusCircle /> Add product
              </Link>
            </Button>
          </EmptyState>
        )
      ) : (
        <AdminProductList products={result.items} currency={settings.currency} />
      )}

      <Pagination page={result.page} pageCount={result.pageCount} hrefFor={hrefFor} />
    </>
  );
}
