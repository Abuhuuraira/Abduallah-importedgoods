import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ChevronRight, SearchX, ServerCrash } from "lucide-react";
import { WhatsAppIcon } from "@/components/icons/whatsapp-icon";
import { LoadMoreProducts } from "@/components/products/load-more-products";
import { ProductFilters } from "@/components/products/product-filters";
import { ProductGridSkeleton } from "@/components/products/product-grid";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PUBLIC_PAGE_SIZE } from "@/lib/constants";
import { getCategories, getSiteSettings, listProducts } from "@/lib/data/public";
import { catalogQueryString, parseCatalogParams } from "@/lib/search-params";
import { buildGeneralMessage, buildWhatsAppUrl, isValidWhatsAppNumber } from "@/lib/whatsapp";

export async function generateMetadata({ searchParams }: PageProps<"/products">): Promise<Metadata> {
  const filters = parseCatalogParams(await searchParams);
  const categories = await getCategories();
  const category = categories.find((c) => c.slug === filters.category);

  let title = "All Products";
  if (filters.q) title = `Search results for “${filters.q}”`;
  else if (category) title = category.name;
  else if (filters.newArrivals) title = "New Arrivals";
  else if (filters.available) title = "Available Now";

  const canonical = category ? `/products?category=${category.slug}` : "/products";

  return {
    title,
    description: category
      ? `Browse wholesale ${category.name.toLowerCase()} — imported quality, prices in PKR, book instantly on WhatsApp.`
      : "Browse our complete catalog of wholesale imported goods. Search, filter by category and book on WhatsApp.",
    alternates: { canonical },
    // Search result pages should not be indexed (thin / duplicate content)
    robots: filters.q ? { index: false, follow: true } : undefined,
  };
}

export default function ProductsPage({ searchParams }: PageProps<"/products">) {
  return (
    <div className="container-page py-6 sm:py-10">
      <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-1 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">
          Home
        </Link>
        <ChevronRight className="size-4" aria-hidden="true" />
        <span className="font-medium text-foreground">Products</span>
      </nav>
      <Suspense fallback={<CatalogSkeleton />}>
        <Catalog searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Catalog({ searchParams }: Pick<PageProps<"/products">, "searchParams">) {
  const filters = parseCatalogParams(await searchParams);
  const [settings, categories, result] = await Promise.all([
    getSiteSettings(),
    getCategories(),
    listProducts({ ...filters, limit: PUBLIC_PAGE_SIZE }),
  ]);

  const category = categories.find((c) => c.slug === filters.category);
  const queryKey = catalogQueryString(filters) || "all";
  const whatsappUrl = isValidWhatsAppNumber(settings.whatsappNumber)
    ? buildWhatsAppUrl(
        settings.whatsappNumber,
        filters.q
          ? `Assalamualaikum ${settings.businessName}!\n\nI am looking for "${filters.q}". Do you have it in stock?`
          : buildGeneralMessage(settings.businessName),
      )
    : null;

  let heading = "All Products";
  if (filters.q) heading = `Results for “${filters.q}”`;
  else if (category) heading = category.name;
  else if (filters.newArrivals) heading = "New Arrivals";
  else if (filters.available) heading = "Available Now";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">{heading}</h1>
        {!result.failed && (
          <p className="mt-1 text-sm text-muted-foreground">
            {result.total} product{result.total === 1 ? "" : "s"} found
          </p>
        )}
      </div>

      {/* Not keyed: this component starts the navigation, so it must stay mounted */}
      <ProductFilters categories={categories} current={filters} />

      {result.failed ? (
        <EmptyState
          icon={ServerCrash}
          title="We couldn't load products right now"
          description="Please refresh the page in a moment. If the problem continues, contact us on WhatsApp."
        />
      ) : result.items.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title="No products match your search"
          description="Try a different word, check the spelling, or clear the filters. You can also ask us directly — we may have it in stock."
        >
          <Button asChild variant="outline">
            <Link href="/products">Clear all filters</Link>
          </Button>
          {whatsappUrl && (
            <Button asChild className="bg-whatsapp hover:bg-whatsapp-hover">
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                <WhatsAppIcon className="size-4" /> Ask on WhatsApp
              </a>
            </Button>
          )}
        </EmptyState>
      ) : (
        <LoadMoreProducts
          key={queryKey}
          initialItems={result.items}
          total={result.total}
          query={filters}
          currency={settings.currency}
          pageSize={PUBLIC_PAGE_SIZE}
        />
      )}
    </div>
  );
}

function CatalogSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-28" />
      </div>
      <Skeleton className="h-36 w-full rounded-2xl sm:h-28" />
      <ProductGridSkeleton count={8} />
    </div>
  );
}
