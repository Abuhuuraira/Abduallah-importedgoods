import Link from "next/link";
import { BrandLogo } from "@/components/brand/brand-logo";
import { WhatsAppIcon } from "@/components/icons/whatsapp-icon";
import { getCategories, getSiteSettings } from "@/lib/data/public";
import { buildGeneralMessage, buildWhatsAppUrl, isValidWhatsAppNumber } from "@/lib/whatsapp";
import { HeaderSearch } from "./header-search";
import { MobileNav } from "./mobile-nav";

export async function SiteHeader() {
  const [settings, categories] = await Promise.all([getSiteSettings(), getCategories()]);
  const whatsappUrl = isValidWhatsAppNumber(settings.whatsappNumber)
    ? buildWhatsAppUrl(settings.whatsappNumber, buildGeneralMessage(settings.businessName))
    : null;

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/products", label: "All Products" },
    { href: "/products?new=1", label: "New Arrivals" },
    { href: "/products?available=1", label: "Available Now" },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container-page">
        <div className="flex h-16 items-center gap-2 md:h-[4.5rem] md:gap-6">
          <MobileNav businessName={settings.businessName} categories={categories} whatsappUrl={whatsappUrl} />

          <Link href="/" className="min-w-0 shrink" aria-label={`${settings.businessName} — home`}>
            <BrandLogo name={settings.businessName} logoUrl={settings.logoUrl} tagline="Wholesale · Imported" />
          </Link>

          <HeaderSearch id="site-search-desktop" className="hidden max-w-md flex-1 md:block lg:max-w-lg" />

          <nav aria-label="Main" className="ml-auto hidden items-center gap-1 lg:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {whatsappUrl && (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto inline-flex h-10 shrink-0 items-center gap-2 rounded-xl bg-whatsapp px-3 text-sm font-semibold text-white transition-colors hover:bg-whatsapp-hover lg:ml-0 lg:px-4"
              aria-label="Chat with us on WhatsApp"
            >
              <WhatsAppIcon className="size-5" />
              <span className="hidden sm:inline">WhatsApp</span>
            </a>
          )}
        </div>

        <div className="pb-3 md:hidden">
          <HeaderSearch id="site-search-mobile" />
        </div>
      </div>
    </header>
  );
}
