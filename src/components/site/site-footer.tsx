import Link from "next/link";
import { cacheLife, cacheTag } from "next/cache";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { BrandLogo } from "@/components/brand/brand-logo";
import { WhatsAppIcon } from "@/components/icons/whatsapp-icon";
import { CACHE_TAGS } from "@/lib/constants";
import { getCategories, getSiteSettings } from "@/lib/data/public";
import {
  buildGeneralMessage,
  buildWhatsAppUrl,
  formatWhatsAppNumberForDisplay,
  isValidWhatsAppNumber,
} from "@/lib/whatsapp";

export async function SiteFooter() {
  "use cache";
  cacheLife("hours");
  cacheTag(CACHE_TAGS.settings, CACHE_TAGS.categories, CACHE_TAGS.products);

  const [settings, categories] = await Promise.all([getSiteSettings(), getCategories()]);
  const hasWhatsApp = isValidWhatsAppNumber(settings.whatsappNumber);
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-border bg-navy text-navy-foreground">
      <div className="container-page grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-4 lg:col-span-2">
          <BrandLogo name={settings.businessName} logoUrl={settings.logoUrl} inverted />
          <p className="max-w-md text-sm leading-relaxed text-navy-foreground/75">{settings.welcomeText}</p>
          {hasWhatsApp && (
            <a
              href={buildWhatsAppUrl(settings.whatsappNumber, buildGeneralMessage(settings.businessName))}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-12 items-center gap-2 rounded-xl bg-whatsapp px-5 font-semibold text-white transition-colors hover:bg-whatsapp-hover"
            >
              <WhatsAppIcon className="size-5" />
              WhatsApp: {formatWhatsAppNumberForDisplay(settings.whatsappNumber)}
            </a>
          )}
        </div>

        <div>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gold">Shop</h2>
          <ul className="space-y-2.5 text-sm">
            <li><Link href="/products" className="text-navy-foreground/80 hover:text-white">All Products</Link></li>
            <li><Link href="/products?new=1" className="text-navy-foreground/80 hover:text-white">New Arrivals</Link></li>
            <li><Link href="/products?available=1" className="text-navy-foreground/80 hover:text-white">Available Now</Link></li>
            {categories.slice(0, 6).map((c) => (
              <li key={c.slug}>
                <Link href={`/products?category=${c.slug}`} className="text-navy-foreground/80 hover:text-white">
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gold">Contact</h2>
          <ul className="space-y-3 text-sm text-navy-foreground/80">
            {hasWhatsApp && (
              <li className="flex gap-2.5">
                <WhatsAppIcon className="mt-0.5 size-4 shrink-0" />
                <a href={buildWhatsAppUrl(settings.whatsappNumber)} target="_blank" rel="noopener noreferrer" className="hover:text-white">
                  {formatWhatsAppNumberForDisplay(settings.whatsappNumber)}
                </a>
              </li>
            )}
            {settings.contactPhone && (
              <li className="flex gap-2.5">
                <Phone className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <a href={`tel:${settings.contactPhone.replace(/[^\d+]/g, "")}`} className="hover:text-white">
                  {settings.contactPhone}
                </a>
              </li>
            )}
            {settings.contactEmail && (
              <li className="flex gap-2.5">
                <Mail className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <a href={`mailto:${settings.contactEmail}`} className="break-all hover:text-white">
                  {settings.contactEmail}
                </a>
              </li>
            )}
            {settings.address && (
              <li className="flex gap-2.5">
                <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <span className="whitespace-pre-line">{settings.address}</span>
              </li>
            )}
            {settings.businessHours && (
              <li className="flex gap-2.5">
                <Clock className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <span>{settings.businessHours}</span>
              </li>
            )}
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-page flex flex-col gap-2 py-5 text-xs text-navy-foreground/60 sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} {settings.businessName}. All rights reserved.</p>
          <p>Prices in {settings.currency}. Bookings are confirmed on WhatsApp.</p>
        </div>
      </div>
    </footer>
  );
}
