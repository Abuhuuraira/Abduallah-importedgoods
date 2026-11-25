"use server";

import { refresh, updateTag } from "next/cache";
import { getAdminForAction } from "@/lib/auth";
import { CACHE_TAGS } from "@/lib/constants";
import { fieldErrorsOf, settingsSchema } from "@/lib/validation";
import type { ActionResult } from "@/types";
import { UNAUTHORIZED, dbErrorMessage, imageExists, publicImageUrl, removeImage } from "./helpers";

export async function updateSettingsAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const admin = await getAdminForAction();
  if (!admin) return UNAUTHORIZED;
  const { supabase } = admin;

  const parsed = settingsSchema.safeParse({
    business_name: formData.get("business_name"),
    whatsapp_number: formData.get("whatsapp_number") ?? "",
    currency: formData.get("currency"),
    welcome_text: formData.get("welcome_text"),
    contact_phone: formData.get("contact_phone"),
    contact_email: formData.get("contact_email"),
    address: formData.get("address"),
    business_hours: formData.get("business_hours"),
    logo_path: formData.get("logo_path"),
  });
  if (!parsed.success) {
    return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: fieldErrorsOf(parsed.error) };
  }
  const input = parsed.data;

  const { data: current, error: currentError } = await supabase
    .from("admin_settings")
    .select("logo_path")
    .eq("id", 1)
    .maybeSingle();
  if (currentError) return { ok: false, error: dbErrorMessage(currentError, "load the settings") };

  const oldLogo = current?.logo_path ?? null;
  const logoChanged = oldLogo !== input.logo_path;
  if (logoChanged && input.logo_path && !(await imageExists(supabase, input.logo_path))) {
    return {
      ok: false,
      error: "The uploaded logo could not be found. Please upload it again.",
      fieldErrors: { logo_path: ["Please upload the logo again."] },
    };
  }

  const { data, error } = await supabase
    .from("admin_settings")
    .update({
      business_name: input.business_name,
      whatsapp_number: input.whatsapp_number,
      currency: input.currency,
      welcome_text: input.welcome_text,
      contact_phone: input.contact_phone,
      contact_email: input.contact_email,
      address: input.address,
      business_hours: input.business_hours,
      logo_path: input.logo_path,
      logo_url: input.logo_path ? publicImageUrl(supabase, input.logo_path) : null,
    })
    .eq("id", 1)
    .select("id")
    .maybeSingle();

  if (error) return { ok: false, error: dbErrorMessage(error, "save the settings") };
  if (!data) {
    return {
      ok: false,
      error: "Settings row is missing. Run the database migrations again (see DEPLOYMENT.md).",
    };
  }

  if (logoChanged) await removeImage(supabase, oldLogo);

  // Business name, WhatsApp number, etc. appear on every public page.
  updateTag(CACHE_TAGS.settings);
  refresh();
  return { ok: true, message: "Settings saved. The website now uses the new details." };
}
