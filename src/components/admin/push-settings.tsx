"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { BellOff, BellRing, Loader2, Send, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  deletePushDeviceAction,
  savePushDeviceAction,
  sendTestPushAction,
  updatePushDeviceAction,
} from "@/lib/actions/push";

type Device = { endpoint: string; label: string; notifyOrders: boolean; notifyLikes: boolean };

type Props = {
  /** null when VAPID_PRIVATE_KEY is not set on the server. */
  vapidPublicKey: string | null;
  devices: Device[];
};

type Support = "checking" | "supported" | "ios-install" | "unsupported";

function base64UrlToBytes(value: string): Uint8Array<ArrayBuffer> {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function deviceLabel(): string {
  const ua = navigator.userAgent;
  const device = /iPhone/.test(ua)
    ? "iPhone"
    : /iPad/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
      ? "iPad"
      : /Android/.test(ua)
        ? /Mobile/.test(ua) ? "Android phone" : "Android tablet"
        : /Windows/.test(ua)
          ? "Windows computer"
          : /Macintosh/.test(ua)
            ? "Mac"
            : "Computer";
  const browser = /Edg\//.test(ua) ? "Edge" : /SamsungBrowser/.test(ua) ? "Samsung Internet" : /Firefox\//.test(ua) ? "Firefox" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "";
  return browser ? `${device} · ${browser}` : device;
}

async function getRegistration(): Promise<ServiceWorkerRegistration> {
  const existing = await navigator.serviceWorker.getRegistration("/");
  if (existing) return existing;
  await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  return navigator.serviceWorker.ready;
}

export function PushSettings({ vapidPublicKey, devices }: Props) {
  const router = useRouter();
  const [support, setSupport] = useState<Support>("checking");
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [endpoint, setEndpoint] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
    if (!supported) {
      queueMicrotask(() => !cancelled && setSupport(ios ? "ios-install" : "unsupported"));
      return;
    }
    (async () => {
      const reg = await navigator.serviceWorker.getRegistration("/");
      const sub = reg ? await reg.pushManager.getSubscription() : null;
      if (cancelled) return;
      setPermission(Notification.permission);
      setEndpoint(sub?.endpoint ?? null);
      setSupport("supported");
    })().catch(() => !cancelled && setSupport("unsupported"));
    return () => {
      cancelled = true;
    };
  }, []);

  const thisDevice = endpoint ? devices.find((d) => d.endpoint === endpoint) ?? null : null;
  const otherDevices = devices.filter((d) => d.endpoint !== endpoint);

  const turnOn = () =>
    startTransition(async () => {
      if (!vapidPublicKey) return;
      try {
        const result = await Notification.requestPermission();
        setPermission(result);
        if (result !== "granted") {
          toast.error("Notifications are blocked. Allow them for this website in your browser settings, then try again.");
          return;
        }
        const reg = await getRegistration();
        const key = base64UrlToBytes(vapidPublicKey);
        let sub = await reg.pushManager.getSubscription();
        if (sub) {
          // Re-subscribe if it was created with a different server key.
          const current = sub.options.applicationServerKey;
          const same = current && new Uint8Array(current).every((b, i) => b === key[i]) && new Uint8Array(current).length === key.length;
          if (!same) {
            await sub.unsubscribe();
            sub = null;
          }
        }
        sub ??= await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
        const saved = await savePushDeviceAction(sub.toJSON(), deviceLabel());
        if (!saved.ok) {
          toast.error(saved.error);
          return;
        }
        setEndpoint(sub.endpoint);
        toast.success(saved.message ?? "Notifications are on.");
        router.refresh();
      } catch (error) {
        console.error("[push] subscribe failed", error);
        toast.error("This browser could not turn on notifications. Try Chrome, or on iPhone add the site to your Home Screen first.");
      }
    });

  const turnOff = () =>
    startTransition(async () => {
      if (!endpoint) return;
      try {
        const reg = await navigator.serviceWorker.getRegistration("/");
        const sub = reg ? await reg.pushManager.getSubscription() : null;
        await sub?.unsubscribe();
      } catch {
        // continue — removing it on the server is what matters
      }
      const result = await deletePushDeviceAction(endpoint);
      if (result.ok) {
        setEndpoint(null);
        toast.success(result.message ?? "Turned off.");
        router.refresh();
      } else toast.error(result.error);
    });

  const updatePrefs = (orders: boolean, likes: boolean) =>
    startTransition(async () => {
      if (!endpoint) return;
      const result = await updatePushDeviceAction(endpoint, orders, likes);
      if (result.ok) router.refresh();
      else toast.error(result.error);
    });

  const sendTest = () =>
    startTransition(async () => {
      if (!endpoint) return;
      const result = await sendTestPushAction(endpoint);
      if (result.ok) toast.success(result.message ?? "Sent.");
      else toast.error(result.error);
    });

  return (
    <section className="rounded-2xl border border-border/70 bg-card p-4 shadow-soft sm:p-6" aria-labelledby="push-heading" data-testid="push-settings">
      <h2 id="push-heading" className="flex items-center gap-2 text-lg font-bold">
        <BellRing className="size-5 text-muted-foreground" aria-hidden="true" /> Phone notifications
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Get an alert on this phone or computer for every new order (and likes, if you want) — even when the website is closed.
      </p>

      <div className="mt-4">
        {!vapidPublicKey ? (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
            <p className="font-semibold">Phone notifications need a one-time setup on Vercel.</p>
            <p className="mt-1">
              Add the environment variable <code className="rounded bg-white px-1">VAPID_PRIVATE_KEY</code> in Vercel → Settings →
              Environment Variables, then redeploy. See DEPLOYMENT.md, “Phone notifications”. Orders still appear here and in
              the bell without it.
            </p>
          </div>
        ) : support === "checking" ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Checking this device…
          </p>
        ) : support === "ios-install" ? (
          <div className="rounded-xl bg-surface p-4 text-sm">
            <p className="flex items-center gap-2 font-semibold">
              <Smartphone className="size-4" aria-hidden="true" /> On iPhone or iPad, add the website to your Home Screen first:
            </p>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-muted-foreground">
              <li>Open this admin page in <strong>Safari</strong> and tap the <strong>Share</strong> button.</li>
              <li>Choose <strong>Add to Home Screen</strong>. The new icon is called <strong>AIG Admin</strong>.</li>
              <li>Open <strong>AIG Admin</strong> from your Home Screen, sign in, then go to Settings and turn notifications on.</li>
            </ol>
          </div>
        ) : support === "unsupported" ? (
          <p className="rounded-xl bg-surface p-4 text-sm text-muted-foreground">
            This browser does not support notifications. Use Chrome on Android or a computer.
          </p>
        ) : thisDevice ? (
          <div className="space-y-4">
            <p className="flex items-center gap-2 rounded-xl bg-success-soft p-3 text-sm font-semibold text-success" data-testid="push-on">
              <BellRing className="size-4" aria-hidden="true" /> Notifications are on for this device ({thisDevice.label || "this device"}).
            </p>
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-4">
                <Label htmlFor="push-orders" className="text-sm font-medium">New orders</Label>
                <Switch
                  id="push-orders"
                  checked={thisDevice.notifyOrders}
                  disabled={pending}
                  onCheckedChange={(v) => updatePrefs(v, thisDevice.notifyLikes)}
                />
              </div>
              <div className="flex items-center justify-between gap-4">
                <Label htmlFor="push-likes" className="text-sm font-medium">New likes</Label>
                <Switch
                  id="push-likes"
                  checked={thisDevice.notifyLikes}
                  disabled={pending}
                  onCheckedChange={(v) => updatePrefs(thisDevice.notifyOrders, v)}
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={sendTest} disabled={pending} data-testid="push-test">
                {pending ? <Loader2 className="animate-spin" /> : <Send />} Send test notification
              </Button>
              <Button type="button" variant="ghost" onClick={turnOff} disabled={pending} className="text-muted-foreground">
                <BellOff /> Turn off on this device
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {permission === "denied" && (
              <p className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                Notifications are blocked for this website. Open your browser’s site settings, allow notifications, then reload this page.
              </p>
            )}
            <Button type="button" size="lg" className="h-12" onClick={turnOn} disabled={pending || permission === "denied"} data-testid="push-enable">
              {pending ? <Loader2 className="animate-spin" /> : <BellRing />} Turn on notifications on this device
            </Button>
          </div>
        )}
      </div>

      {otherDevices.length > 0 && (
        <p className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">
          Also on: {otherDevices.map((d) => d.label || "another device").join(", ")}.
        </p>
      )}
    </section>
  );
}
