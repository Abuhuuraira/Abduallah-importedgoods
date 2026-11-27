import { CalendarCheck, Info, Lock, MessageCircleQuestion } from "lucide-react";
import { WhatsAppIcon } from "@/components/icons/whatsapp-icon";
import { OrderDialog } from "@/components/products/order-dialog";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  buildBookingMessage,
  buildInquiryMessage,
  buildWhatsAppUrl,
  isValidWhatsAppNumber,
  type WhatsAppProduct,
} from "@/lib/whatsapp";
import type { SiteSettings } from "@/types";

type Props = {
  product: WhatsAppProduct;
  settings: SiteSettings;
  productUrl: string;
};

type BarProduct = WhatsAppProduct & { id: string; image_url: string };

const baseBtn =
  "inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl px-5 text-[0.95rem] font-bold uppercase tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

export function WhatsAppActions({ product, settings, productUrl }: Props) {
  const booked = product.status === "booked";
  const ctx = { businessName: settings.businessName, currency: settings.currency, productUrl };

  if (!isValidWhatsAppNumber(settings.whatsappNumber)) {
    return (
      <div className="flex gap-3 rounded-xl border border-border bg-surface p-4 text-sm text-muted-foreground">
        <Info className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
        <p>
          WhatsApp ordering is being set up.
          {settings.contactPhone ? ` Please call us on ${settings.contactPhone} to book this product.` : " Please check back soon."}
        </p>
      </div>
    );
  }

  const bookingUrl = buildWhatsAppUrl(settings.whatsappNumber, buildBookingMessage(product, ctx));
  const inquiryUrl = buildWhatsAppUrl(settings.whatsappNumber, buildInquiryMessage(product, ctx));

  if (booked) {
    return (
      <div className="space-y-3">
        <div className="flex gap-3 rounded-xl border border-booked/25 bg-booked-soft p-4 text-sm text-booked" role="status">
          <Lock className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
          <p>
            <strong className="font-semibold">This product is currently booked</strong> and not available for booking.
            You can still ask us about future stock or similar items.
          </p>
        </div>
        <button type="button" disabled aria-disabled="true" className={cn(baseBtn, "cursor-not-allowed bg-muted text-muted-foreground")}>
          <Lock className="size-5" aria-hidden="true" /> Booked — Unavailable
        </button>
        <a
          href={inquiryUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(baseBtn, "border-2 border-whatsapp bg-background text-whatsapp hover:bg-success-soft")}
        >
          <MessageCircleQuestion className="size-5" aria-hidden="true" /> Ask about future stock
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <a
        href={bookingUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(baseBtn, "bg-whatsapp text-white shadow-soft hover:bg-whatsapp-hover")}
      >
        <WhatsAppIcon className="size-5" /> Book on WhatsApp
      </a>
      <a
        href={inquiryUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(baseBtn, "border-2 border-whatsapp bg-background text-whatsapp hover:bg-success-soft")}
      >
        <MessageCircleQuestion className="size-5" aria-hidden="true" /> Inquire on WhatsApp
      </a>
      <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
        <CalendarCheck className="size-3.5" aria-hidden="true" />
        We confirm availability on WhatsApp before your booking is final.
      </p>
    </div>
  );
}

/** Compact sticky bar shown at the bottom of the screen on phones. */
export function MobileBookingBar({ product, settings, productUrl }: Omit<Props, "product"> & { product: BarProduct }) {
  const booked = product.status === "booked";
  const hasWhatsApp = isValidWhatsAppNumber(settings.whatsappNumber);
  if (booked && !hasWhatsApp) return null;
  const ctx = { businessName: settings.businessName, currency: settings.currency, productUrl };
  const url = hasWhatsApp
    ? buildWhatsAppUrl(settings.whatsappNumber, booked ? buildInquiryMessage(product, ctx) : buildBookingMessage(product, ctx))
    : null;

  return (
    <div
      data-sticky-cta
      className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 px-4 pt-3 shadow-[0_-8px_24px_-12px_rgb(15_23_42/0.2)] backdrop-blur md:hidden"
    >
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs text-muted-foreground">{product.product_code}</p>
          <p className="truncate text-base font-bold">{formatPrice(product.price, settings.currency)}</p>
        </div>
        {booked ? (
          url && (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl border-2 border-whatsapp px-5 text-sm font-bold uppercase tracking-wide text-whatsapp"
            >
              <WhatsAppIcon className="size-5" />
              Ask about stock
            </a>
          )
        ) : (
          <>
            {url && (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Book on WhatsApp"
                className="inline-flex size-12 shrink-0 items-center justify-center rounded-xl bg-whatsapp text-white hover:bg-whatsapp-hover"
              >
                <WhatsAppIcon className="size-6" />
              </a>
            )}
            <OrderDialog product={product} currency={settings.currency} shopWhatsapp={settings.whatsappNumber} variant="compact" />
          </>
        )}
      </div>
    </div>
  );
}
