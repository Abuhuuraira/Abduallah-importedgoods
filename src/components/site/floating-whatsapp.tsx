import { WhatsAppIcon } from "@/components/icons/whatsapp-icon";
import { getSiteSettings } from "@/lib/data/public";
import { buildGeneralMessage, buildWhatsAppUrl, isValidWhatsAppNumber } from "@/lib/whatsapp";

export async function FloatingWhatsApp() {
  const settings = await getSiteSettings();
  if (!isValidWhatsAppNumber(settings.whatsappNumber)) return null;

  return (
    <a
      data-floating-whatsapp
      href={buildWhatsAppUrl(settings.whatsappNumber, buildGeneralMessage(settings.businessName))}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
      className="group fixed right-4 bottom-4 z-40 flex size-14 items-center justify-center rounded-full bg-whatsapp text-white shadow-lift transition-transform hover:scale-105 hover:bg-whatsapp-hover focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-whatsapp/40 sm:right-6 sm:bottom-6"
    >
      <span className="absolute inset-0 animate-ping rounded-full bg-whatsapp opacity-20 [animation-duration:2.5s]" aria-hidden="true" />
      <WhatsAppIcon className="relative size-7" />
    </a>
  );
}
