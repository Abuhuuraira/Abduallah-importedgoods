import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CalendarDays, ChevronRight, Hash, Layers, PackageCheck } from "lucide-react";
import { NewArrivalBadge, StatusBadge } from "@/components/products/badges";
import { LikeButton } from "@/components/products/like-button";
import { OrderDialog } from "@/components/products/order-dialog";
import { ProductGrid } from "@/components/products/product-grid";
import { ShareActions } from "@/components/products/share-actions";
import { MobileBookingBar, WhatsAppActions } from "@/components/products/whatsapp-actions";
import { SectionHeading } from "@/components/shared/section-heading";
import { Skeleton } from "@/components/ui/skeleton";
import { getProductBySlug, getPublishedProductSlugs, getRelatedProducts, getSiteSettings } from "@/lib/data/public";
import { formatDate, formatPrice } from "@/lib/format";
import { absoluteUrl, productPath } from "@/lib/site";
import { cn } from "@/lib/utils";

/** Prerender the most recently updated products at build time; others render on first visit. */
export async function generateStaticParams() {
  const products = await getPublishedProductSlugs(50);
  // Cache Components requires at least one entry; the placeholder renders a 404.
  if (products.length === 0) return [{ slug: "__placeholder__" }];
  return products.map((p) => ({ slug: p.slug }));
}

function truncate(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean;
}

export async function generateMetadata({ params }: PageProps<"/products/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const [product, settings] = await Promise.all([getProductBySlug(slug), getSiteSettings()]);
  if (!product) {
    return { title: "Product not found", robots: { index: false, follow: true } };
  }

  const price = formatPrice(product.price, settings.currency);
  const availability = product.status === "booked" ? "Currently booked" : "Available";
  const description = product.description
    ? truncate(`${price} · ${availability}. ${product.description}`, 160)
    : `${product.name} (${product.product_code}) — ${price}. ${availability}. Book on WhatsApp with ${settings.businessName}.`;
  const path = productPath(product.slug);

  return {
    title: `${product.name} (${product.product_code})`,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      url: path,
      title: `${product.name} — ${price}`,
      description,
      siteName: settings.businessName,
      images: [{ url: product.image_url, alt: product.name }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${product.name} — ${price}`,
      description,
      images: [product.image_url],
    },
  };
}

export default function ProductPage({ params }: PageProps<"/products/[slug]">) {
  return (
    <Suspense fallback={<ProductDetailSkeleton />}>
      <ProductDetailView params={params} />
    </Suspense>
  );
}

async function ProductDetailView({ params }: Pick<PageProps<"/products/[slug]">, "params">) {
  const { slug } = await params;
  const [product, settings] = await Promise.all([getProductBySlug(slug), getSiteSettings()]);
  if (!product) notFound();

  const related = await getRelatedProducts(product);
  const path = productPath(product.slug);
  const productUrl = absoluteUrl(path);
  const booked = product.status === "booked";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    sku: product.product_code,
    productID: product.product_code,
    image: [product.image_url],
    description: product.description || product.name,
    category: product.category_name ?? undefined,
    url: productUrl,
    offers:
      product.price !== null
        ? {
            "@type": "Offer",
            url: productUrl,
            price: product.price,
            priceCurrency: settings.currency.toUpperCase() === "RS." ? "PKR" : settings.currency.toUpperCase(),
            availability: booked ? "https://schema.org/SoldOut" : "https://schema.org/InStock",
            seller: { "@type": "Organization", name: settings.businessName },
          }
        : undefined,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />

      <div className="container-page pt-4 pb-28 sm:pt-6 md:pb-14">
        <nav aria-label="Breadcrumb" className="mb-4 flex min-w-0 items-center gap-1 overflow-hidden text-sm text-muted-foreground">
          <Link href="/" className="shrink-0 hover:text-foreground">Home</Link>
          <ChevronRight className="size-4 shrink-0" aria-hidden="true" />
          <Link href="/products" className="shrink-0 hover:text-foreground">Products</Link>
          {product.category_slug && (
            <>
              <ChevronRight className="size-4 shrink-0" aria-hidden="true" />
              <Link href={`/products?category=${product.category_slug}`} className="shrink-0 hover:text-foreground">
                {product.category_name}
              </Link>
            </>
          )}
          <ChevronRight className="size-4 shrink-0" aria-hidden="true" />
          <span className="truncate font-medium text-foreground">{product.name}</span>
        </nav>

        <div className="grid gap-6 md:grid-cols-2 md:gap-10 lg:gap-14">
          {/* Image */}
          <div className="md:sticky md:top-24 md:self-start">
            <div className="relative aspect-square overflow-hidden rounded-2xl border border-border/70 bg-surface shadow-soft">
              <Image
                src={product.image_url}
                alt={product.name}
                fill
                preload
                sizes="(min-width: 1280px) 600px, (min-width: 768px) 50vw, 100vw"
                className={cn("object-contain", booked && "opacity-80 grayscale-[50%]")}
              />
              <div className="absolute inset-x-3 top-3 flex items-start justify-between gap-2">
                {product.is_new_arrival ? <NewArrivalBadge size="lg" /> : <span />}
                <StatusBadge status={product.status} size="lg" />
              </div>
              {booked && (
                <div className="absolute inset-x-0 bottom-0 bg-booked/90 py-2 text-center text-sm font-bold uppercase tracking-[0.25em] text-white">
                  Booked
                </div>
              )}
            </div>
          </div>

          {/* Details */}
          <div className="min-w-0 space-y-6">
            <div className="space-y-3">
              {product.category_slug && (
                <Link
                  href={`/products?category=${product.category_slug}`}
                  className="inline-block text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground hover:text-primary"
                >
                  {product.category_name}
                </Link>
              )}
              <h1 className="text-2xl font-bold leading-tight break-words sm:text-3xl">{product.name}</h1>
              <p className="inline-flex items-center gap-1.5 rounded-lg bg-muted px-2.5 py-1 font-mono text-sm font-semibold text-foreground">
                <Hash className="size-3.5" aria-hidden="true" /> {product.product_code}
              </p>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className={cn("text-3xl font-extrabold", product.price === null && "text-xl text-muted-foreground")}>
                  {formatPrice(product.price, settings.currency)}
                </p>
                <LikeButton productId={product.id} />
              </div>
            </div>

            {!booked && (
              <div className="space-y-2">
                <OrderDialog product={product} currency={settings.currency} shopWhatsapp={settings.whatsappNumber} />
                <p className="text-center text-xs text-muted-foreground">Pay cash when your order is delivered.</p>
              </div>
            )}

            <WhatsAppActions product={product} settings={settings} productUrl={productUrl} />

            <ShareActions path={path} title={product.name} text={`${product.name} — ${formatPrice(product.price, settings.currency)}`} />

            <dl className="grid grid-cols-2 gap-3 rounded-2xl border border-border/70 bg-surface p-4 text-sm">
              <div>
                <dt className="flex items-center gap-1.5 text-muted-foreground"><Hash className="size-3.5" aria-hidden="true" /> Product ID</dt>
                <dd className="mt-0.5 font-semibold">{product.product_code}</dd>
              </div>
              <div>
                <dt className="flex items-center gap-1.5 text-muted-foreground"><Layers className="size-3.5" aria-hidden="true" /> Category</dt>
                <dd className="mt-0.5 font-semibold">{product.category_name ?? "Uncategorized"}</dd>
              </div>
              <div>
                <dt className="flex items-center gap-1.5 text-muted-foreground"><PackageCheck className="size-3.5" aria-hidden="true" /> Availability</dt>
                <dd className={cn("mt-0.5 font-semibold", booked ? "text-booked" : "text-success")}>
                  {booked ? "Booked" : "Available"}
                </dd>
              </div>
              <div>
                <dt className="flex items-center gap-1.5 text-muted-foreground"><CalendarDays className="size-3.5" aria-hidden="true" /> Date added</dt>
                <dd className="mt-0.5 font-semibold">{formatDate(product.created_at)}</dd>
              </div>
            </dl>

            <section aria-labelledby="description-heading">
              <h2 id="description-heading" className="mb-2 text-lg font-semibold">Description</h2>
              {product.description ? (
                <div className="text-[0.95rem] leading-relaxed whitespace-pre-line break-words text-foreground/85">
                  {product.description}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Contact us on WhatsApp for full details about this product.
                </p>
              )}
            </section>
          </div>
        </div>

        {related.length > 0 && (
          <section aria-labelledby="related-heading" className="mt-12 sm:mt-16">
            <SectionHeading
              id="related-heading"
              title="Related products"
              href={product.category_slug ? `/products?category=${product.category_slug}` : "/products"}
            />
            <ProductGrid products={related} currency={settings.currency} />
          </section>
        )}
      </div>

      <MobileBookingBar product={product} settings={settings} productUrl={productUrl} />
    </>
  );
}

function ProductDetailSkeleton() {
  return (
    <div className="container-page pt-4 pb-14 sm:pt-6">
      <Skeleton className="mb-4 h-4 w-64" />
      <div className="grid gap-6 md:grid-cols-2 md:gap-10">
        <Skeleton className="aspect-square w-full rounded-2xl" />
        <div className="space-y-4">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-8 w-4/5" />
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-28 w-full rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
