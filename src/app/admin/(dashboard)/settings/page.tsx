import type { Metadata } from "next";
import { ChangePasswordForm } from "@/components/admin/change-password-form";
import { PageHeader } from "@/components/admin/page-header";
import { SettingsForm } from "@/components/admin/settings-form";
import { requireAdmin } from "@/lib/auth";
import { getAdminSettings } from "@/lib/data/admin";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  await requireAdmin();
  const settings = await getAdminSettings();
  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Settings"
        description={`Business details used across the whole website.${settings.updatedAt ? ` Last updated ${formatDateTime(settings.updatedAt)}.` : ""}`}
      />
      <SettingsForm key={settings.updatedAt ?? "initial"} settings={settings} />
      <div className="mt-10">
        <ChangePasswordForm />
      </div>
    </div>
  );
}
