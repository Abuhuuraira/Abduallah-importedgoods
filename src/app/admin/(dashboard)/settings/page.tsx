import type { Metadata } from "next";
import { ChangePasswordForm } from "@/components/admin/change-password-form";
import { PageHeader } from "@/components/admin/page-header";
import { PushSettings } from "@/components/admin/push-settings";
import { SettingsForm } from "@/components/admin/settings-form";
import { requireAdmin } from "@/lib/auth";
import { getAdminSettings, listPushDevices } from "@/lib/data/admin";
import { getVapidPublicKey } from "@/lib/push";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  await requireAdmin();
  const [settings, devices] = await Promise.all([getAdminSettings(), listPushDevices()]);
  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Settings"
        description={`Business details used across the whole website.${settings.updatedAt ? ` Last updated ${formatDateTime(settings.updatedAt)}.` : ""}`}
      />
      {devices.installed && (
        <div className="mb-8">
          <PushSettings vapidPublicKey={getVapidPublicKey()} devices={devices.data} />
        </div>
      )}
      <SettingsForm key={settings.updatedAt ?? "initial"} settings={settings} />
      <div className="mt-10">
        <ChangePasswordForm />
      </div>
    </div>
  );
}
