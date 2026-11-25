"use client";

import { useCallback, useState, useTransition } from "react";
import { toast } from "sonner";
import { ExternalLink, Loader2, Save, TriangleAlert } from "lucide-react";
import { WhatsAppIcon } from "@/components/icons/whatsapp-icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateSettingsAction } from "@/lib/actions/settings";
import { buildWhatsAppUrl, formatWhatsAppNumberForDisplay, normalizeWhatsAppNumber } from "@/lib/whatsapp";
import type { ActionResult, SiteSettings } from "@/types";
import { ImageUploader } from "./image-uploader";

export function SettingsForm({ settings }: { settings: SiteSettings }) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);
  const [uploading, setUploading] = useState(false);
  const [whatsapp, setWhatsapp] = useState(settings.whatsappNumber);
  const [welcome, setWelcome] = useState(settings.welcomeText);

  const onBusyChange = useCallback((busy: boolean) => setUploading(busy), []);
  const normalized = normalizeWhatsAppNumber(whatsapp);
  const fieldError = (name: string) => (result && !result.ok ? result.fieldErrors?.[name]?.[0] : undefined);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (uploading) {
      toast.info("Please wait for the logo upload to finish.");
      return;
    }
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const res = await updateSettingsAction(null, formData);
      setResult(res);
      if (res.ok) {
        toast.success(res.message);
        if (normalized) setWhatsapp(normalized);
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5 pb-24 lg:pb-0">
      {result && !result.ok && (
        <div className="flex gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive" role="alert">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" /> {result.error}
        </div>
      )}

      <section className="space-y-5 rounded-2xl border border-border/70 bg-card p-4 shadow-soft sm:p-5">
        <h2 className="font-semibold">WhatsApp booking</h2>
        <div className="space-y-2">
          <Label htmlFor="whatsapp_number">
            WhatsApp number <span className="text-destructive">*</span>
          </Label>
          <Input
            id="whatsapp_number"
            name="whatsapp_number"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            inputMode="tel"
            autoComplete="tel"
            placeholder="923001234567"
            aria-invalid={Boolean(fieldError("whatsapp_number"))}
            aria-describedby="whatsapp-help"
          />
          {fieldError("whatsapp_number") ? (
            <p className="text-sm text-destructive">{fieldError("whatsapp_number")}</p>
          ) : (
            <p id="whatsapp-help" className="text-xs text-muted-foreground">
              International format without “+” or spaces — e.g. <strong>923001234567</strong>. A local number like
              0300 1234567 is converted automatically.
            </p>
          )}
          {normalized && (
            <div className="flex flex-wrap items-center gap-2 rounded-xl bg-success-soft p-3 text-sm text-success">
              <WhatsAppIcon className="size-4" />
              Customers will message <strong>{formatWhatsAppNumberForDisplay(normalized)}</strong>
              <a
                href={buildWhatsAppUrl(normalized, "Test message from the website settings page.")}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto inline-flex items-center gap-1 font-semibold underline-offset-2 hover:underline"
              >
                Test link <ExternalLink className="size-3.5" />
              </a>
            </div>
          )}
        </div>
      </section>

      <section className="space-y-5 rounded-2xl border border-border/70 bg-card p-4 shadow-soft sm:p-5">
        <h2 className="font-semibold">Business details</h2>

        <div className="space-y-2">
          <Label htmlFor="business_name">
            Business name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="business_name"
            name="business_name"
            defaultValue={settings.businessName}
            maxLength={100}
            required
            aria-invalid={Boolean(fieldError("business_name"))}
          />
          {fieldError("business_name") && <p className="text-sm text-destructive">{fieldError("business_name")}</p>}
        </div>

        <ImageUploader
          name="logo_path"
          folder="branding"
          label="Business logo (optional)"
          variant="logo"
          removable
          initialPath={settings.logoPath}
          initialUrl={settings.logoUrl}
          error={fieldError("logo_path")}
          onBusyChange={onBusyChange}
        />

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="welcome_text">Homepage welcome text</Label>
            <span className="text-xs text-muted-foreground">{welcome.length}/500</span>
          </div>
          <Textarea
            id="welcome_text"
            name="welcome_text"
            value={welcome}
            onChange={(e) => setWelcome(e.target.value)}
            maxLength={500}
            rows={3}
            aria-invalid={Boolean(fieldError("welcome_text"))}
          />
          {fieldError("welcome_text") && <p className="text-sm text-destructive">{fieldError("welcome_text")}</p>}
        </div>

        <div className="space-y-2 sm:max-w-48">
          <Label htmlFor="currency">Currency</Label>
          <Input id="currency" name="currency" defaultValue={settings.currency} maxLength={10} placeholder="PKR" aria-invalid={Boolean(fieldError("currency"))} />
          {fieldError("currency") ? (
            <p className="text-sm text-destructive">{fieldError("currency")}</p>
          ) : (
            <p className="text-xs text-muted-foreground">PKR is shown as “Rs.”</p>
          )}
        </div>
      </section>

      <section className="space-y-5 rounded-2xl border border-border/70 bg-card p-4 shadow-soft sm:p-5">
        <h2 className="font-semibold">Contact information</h2>
        <p className="-mt-3 text-sm text-muted-foreground">Shown in the website footer. Leave a field empty to hide it.</p>
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="contact_phone">Phone</Label>
            <Input id="contact_phone" name="contact_phone" defaultValue={settings.contactPhone ?? ""} inputMode="tel" maxLength={30} placeholder="0300 1234567" aria-invalid={Boolean(fieldError("contact_phone"))} />
            {fieldError("contact_phone") && <p className="text-sm text-destructive">{fieldError("contact_phone")}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="contact_email">Email</Label>
            <Input id="contact_email" name="contact_email" type="email" defaultValue={settings.contactEmail ?? ""} maxLength={254} placeholder="info@example.com" aria-invalid={Boolean(fieldError("contact_email"))} />
            {fieldError("contact_email") && <p className="text-sm text-destructive">{fieldError("contact_email")}</p>}
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="address">Address</Label>
          <Textarea id="address" name="address" defaultValue={settings.address ?? ""} maxLength={300} rows={2} className="min-h-20" placeholder="Shop #, Market, City" aria-invalid={Boolean(fieldError("address"))} />
          {fieldError("address") && <p className="text-sm text-destructive">{fieldError("address")}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="business_hours">Business hours</Label>
          <Input id="business_hours" name="business_hours" defaultValue={settings.businessHours ?? ""} maxLength={120} placeholder="Mon–Sat, 10am – 8pm" aria-invalid={Boolean(fieldError("business_hours"))} />
          {fieldError("business_hours") && <p className="text-sm text-destructive">{fieldError("business_hours")}</p>}
        </div>
      </section>

      <div className="hidden justify-end lg:flex">
        <Button type="submit" size="lg" disabled={pending || uploading}>
          {pending ? <Loader2 className="animate-spin" /> : <Save />} {pending ? "Saving…" : "Save settings"}
        </Button>
      </div>

      <div className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 px-4 pt-3 backdrop-blur lg:hidden">
        <Button type="submit" size="lg" disabled={pending || uploading} className="w-full">
          {pending ? <Loader2 className="animate-spin" /> : <Save />} {pending ? "Saving…" : "Save settings"}
        </Button>
      </div>
    </form>
  );
}
