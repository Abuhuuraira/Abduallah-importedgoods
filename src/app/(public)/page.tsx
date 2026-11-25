import Link from "next/link";
import { ArrowRight, BadgePercent, MessageCircle, PackageCheck, Search, ShieldCheck, Truck } from "lucide-react";
import { WhatsAppIcon } from "@/components/icons/whatsapp-icon";
import { LoadMoreProducts } from "@/components/products/load-more-products";
import { ProductRail } from "@/components/products/product-rail";
import { CategoryChips } from "@/components/site/category-chips";
import { EmptyState } from "@/components/shared/empty-state";
import { SectionHeading } from "@/components/shared/section-heading";
import { Button } from "@/components/ui/button";
import { PUBLIC_PAGE_SIZE } from "@/lib/constants";
import { getCategories, getSiteSettings, listProducts } from "@/lib/data/public";
import { buildGeneralMessage, buildWhatsAppUrl, isValidWhatsAppNumber } from "@/lib/whatsapp";

export default async function HomePage() {
  const [settings, categories, newArrivals, latest, all] = await Promise.all([
    getSiteSettings(),
    getCategories(),
    listProducts({ newArrivals: true, limit: 8 }),
    listProducts({ limit: 8 }),
    listProducts({ limit: PUBLIC_PAGE_SIZE }),
  ]);

  const whatsappUrl = isValidWhatsAppNumber(settings.whatsappNumber)
    ? buildWhatsAppUrl(settings.whatsappNumber, buildGeneralMessage(settings.businessName))
    : null;
  const catalogEmpty = !all.failed && all.total === 0;

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-navy text-navy-foreground">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgb(212_160_23/0.22),transparent_55%),radial-gradient(ellipse_at_bottom_left,rgb(59_130_246/0.18),transparent_50%)]"
        />
        <div className="container-page relative py-10 sm:py-14 lg:py-20">
          <div className="max-w-2xl">
            <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium uppercase tracking-[0.16em] text-gold">
              <PackageCheck className="size-3.5" aria-hidden="true" /> Wholesale · Imported · Pakistan
            </p>
            <h1 className="text-3xl font-extrabold leading-tight text-white sm:text-4xl lg:text-5xl">
              {settings.businessName}
            </h1>
            <p className="mt-4 text-base leading-relaxed text-white/80 sm:text-lg">{settings.welcomeText}</p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="bg-gold text-gold-foreground hover:bg-gold/90">
                <Link href="/products">
                  Browse all products <ArrowRight />
                </Link>
              </Button>
              {whatsappUrl && (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-white/25 bg-white/5 px-6 text-base font-semibold text-white transition-colors hover:bg-white/10"
                >
                  <WhatsAppIcon className="size-5" /> Chat on WhatsApp
                </a>
              )}
            </div>
          </div>
          <ul className="mt-10 grid grid-cols-1 gap-3 text-sm sm:grid-cols-3 sm:gap-4">
            {[
              { icon: ShieldCheck, title: "Quality imported stock", text: "Carefully sourced products" },
              { icon: BadgePercent, title: "Wholesale prices", text: "Clear prices in PKR" },
              { icon: MessageCircle, title: "Book on WhatsApp", text: "Fast, personal confirmation" },
            ].map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3.5">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-gold/15 text-gold">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <span>
                  <span className="block font-semibold text-white">{title}</span>
                  <span className="text-white/65">{text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Categories */}
      {categories.length > 0 && (
        <section aria-labelledby="categories-heading" className="container-page pt-8 sm:pt-12">
          <SectionHeading id="categories-heading" eyebrow="Browse" title="Shop by category" />
          <CategoryChips categories={categories} />
        </section>
      )}

      {all.failed && (
        <div className="container-page py-12">
          <EmptyState
            icon={Search}
            title="We couldn't load products right now"
            description="Please refresh the page in a moment. If the problem continues, contact us on WhatsApp."
          >
            {whatsappUrl && (
              <Button asChild className="bg-whatsapp hover:bg-whatsapp-hover">
                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                  <WhatsAppIcon className="size-4" /> Contact us
                </a>
              </Button>
            )}
          </EmptyState>
        </div>
      )}

      {catalogEmpty && (
        <div className="container-page py-12">
          <EmptyState
            icon={Truck}
            title="New stock is on the way"
            description="Our catalog is being updated. Message us on WhatsApp to ask about current stock and prices."
          >
            {whatsappUrl && (
              <Button asChild className="bg-whatsapp hover:bg-whatsapp-hover">
                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                  <WhatsAppIcon className="size-4" /> Ask on WhatsApp
                </a>
              </Button>
            )}
          </EmptyState>
        </div>
      )}

      {/* New arrivals */}
      {newArrivals.items.length > 0 && (
        <section aria-labelledby="new-arrivals-heading" className="container-page pt-10 sm:pt-14">
          <SectionHeading
            id="new-arrivals-heading"
            eyebrow="Just landed"
            title="New Arrivals"
            href="/products?new=1"
          />
          <ProductRail products={newArrivals.items} currency={settings.currency} priorityCount={2} />
        </section>
      )}

      {/* Latest */}
      {latest.items.length > 0 && (
        <section aria-labelledby="latest-heading" className="container-page pt-10 sm:pt-14">
          <SectionHeading id="latest-heading" eyebrow="Fresh in the catalog" title="Latest Products" href="/products" />
          <ProductRail
            products={latest.items}
            currency={settings.currency}
            priorityCount={newArrivals.items.length > 0 ? 0 : 2}
          />
        </section>
      )}

      {/* All products */}
      {all.items.length > 0 && (
        <section aria-labelledby="all-products-heading" className="mt-10 bg-surface py-10 sm:mt-14 sm:py-14">
          <div className="container-page">
            <SectionHeading
              id="all-products-heading"
              eyebrow="Complete catalog"
              title="All Products"
              description={`${all.total} product${all.total === 1 ? "" : "s"} available to browse`}
              href="/products"
              linkLabel="Search & filter"
            />
            {categories.length > 0 && <CategoryChips categories={categories} className="mb-6" />}
            <LoadMoreProducts
              initialItems={all.items}
              total={all.total}
              query={{}}
              currency={settings.currency}
              pageSize={PUBLIC_PAGE_SIZE}
              priorityCount={0}
            />
          </div>
        </section>
      )}

      {/* How booking works */}
      <section aria-labelledby="how-heading" className="container-page py-12 sm:py-16">
        <SectionHeading id="how-heading" eyebrow="Simple & personal" title="How booking works" className="justify-center text-center" />
        <ol className="grid gap-4 sm:grid-cols-3">
          {[
            { icon: Search, title: "1. Find your product", text: "Browse or search by name, product ID or category." },
            { icon: WhatsAppIcon, title: "2. Tap “Book on WhatsApp”", text: "We receive the product details and link instantly." },
            { icon: PackageCheck, title: "3. We confirm", text: "We confirm availability and the product is reserved for you." },
          ].map(({ icon: Icon, title, text }) => (
            <li key={title} className="rounded-2xl border border-border/70 bg-card p-5 shadow-soft">
              <span className="mb-3 flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <h3 className="font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{text}</p>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
