"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { Bell, CheckCheck, Heart, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { isAnalyticsNotInstalled as isMissingFunction } from "@/lib/analytics";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

/*
 * Admin notification bell (new orders and likes). One shared poller for the
 * whole admin panel, even though the bell is shown in two places (sidebar on
 * computers, top bar on phones). New items also pop up as a toast.
 */

type AdminNotification = {
  id: number;
  kind: "order" | "like";
  title: string;
  body: string;
  link: string;
  createdAt: string;
  read: boolean;
};

type BellState = { status: "loading" | "ready" | "unavailable"; unread: number; items: AdminNotification[] };

const POLL_MS = 20_000;
const INITIAL: BellState = { status: "loading", unread: 0, items: [] };

let state: BellState = INITIAL;
let lastSeenId: number | null = null;
let timer: number | null = null;
let subscribers = 0;
let navigate: ((href: string) => void) | null = null;
const listeners = new Set<() => void>();

function setState(next: BellState) {
  state = next;
  listeners.forEach((l) => l());
}

function parse(data: unknown): { unread: number; items: AdminNotification[] } {
  const d = (data && typeof data === "object" ? data : {}) as { unread?: unknown; items?: unknown };
  const items = (Array.isArray(d.items) ? d.items : []).map((raw: Record<string, unknown>) => ({
    id: Number(raw.id) || 0,
    kind: raw.kind === "like" ? ("like" as const) : ("order" as const),
    title: String(raw.title ?? ""),
    body: String(raw.body ?? ""),
    link: typeof raw.link === "string" && raw.link.startsWith("/admin") ? raw.link : "/admin",
    createdAt: String(raw.created_at ?? ""),
    read: raw.read_at != null,
  }));
  return { unread: Number(d.unread) || 0, items };
}

async function poll() {
  if (state.status === "unavailable") return;
  if (state.status === "ready" && document.visibilityState !== "visible") return;
  try {
    const { data, error } = await getSupabaseBrowserClient().rpc("admin_list_notifications", { p_limit: 20 });
    if (error) {
      if (isMissingFunction(error)) setState({ ...state, status: "unavailable" });
      return;
    }
    const parsed = parse(data);
    const maxId = parsed.items.reduce((m, n) => Math.max(m, n.id), 0);
    if (lastSeenId !== null) {
      const fresh = parsed.items.filter((n) => n.id > (lastSeenId ?? 0) && !n.read).slice(0, 3).reverse();
      for (const n of fresh) {
        toast(n.title, {
          description: n.body,
          icon: n.kind === "order" ? <ShoppingBag className="size-4" /> : <Heart className="size-4" />,
          duration: n.kind === "order" ? 15_000 : 6_000,
          action: { label: "Open", onClick: () => void openNotification(n) },
        });
      }
    }
    lastSeenId = Math.max(lastSeenId ?? 0, maxId);
    setState({ status: "ready", ...parsed });
  } catch {
    // Offline — try again next time.
  }
}

async function markRead(ids: number[] | null) {
  await getSupabaseBrowserClient().rpc("admin_mark_notifications_read", { p_ids: ids });
  await poll();
}

async function openNotification(n: AdminNotification) {
  if (!n.read) void markRead([n.id]);
  if (navigate) navigate(n.link);
  else window.location.assign(n.link);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  subscribers++;
  if (subscribers === 1) {
    void poll();
    timer = window.setInterval(poll, POLL_MS);
    document.addEventListener("visibilitychange", onVisible);
  }
  return () => {
    listeners.delete(listener);
    subscribers--;
    if (subscribers === 0) {
      if (timer) window.clearInterval(timer);
      timer = null;
      document.removeEventListener("visibilitychange", onVisible);
    }
  };
}

function onVisible() {
  if (document.visibilityState === "visible") void poll();
}

const relative = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
function timeAgo(iso: string): string {
  const seconds = Math.round((new Date(iso).getTime() - Date.now()) / 1000);
  const abs = Math.abs(seconds);
  if (abs < 60) return "just now";
  if (abs < 3600) return relative.format(Math.round(seconds / 60), "minute");
  if (abs < 86400) return relative.format(Math.round(seconds / 3600), "hour");
  return relative.format(Math.round(seconds / 86400), "day");
}

export function NotificationBell({ className }: { className?: string }) {
  const router = useRouter();
  const bell = useSyncExternalStore(subscribe, () => state, () => INITIAL);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    navigate = (href) => router.push(href);
  }, [router]);

  if (bell.status === "unavailable") return null;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn("relative", className)}
          aria-label={bell.unread > 0 ? `Notifications, ${bell.unread} unread` : "Notifications"}
          data-testid="notification-bell"
        >
          <Bell className="size-5" />
          {bell.unread > 0 && (
            <span
              className="absolute -top-0.5 -right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-booked px-1 text-[11px] font-bold text-white"
              data-testid="notification-count"
            >
              {bell.unread > 99 ? "99+" : bell.unread}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[90vw] max-w-sm gap-0 p-0">
        <SheetHeader className="border-b border-border p-5">
          <SheetTitle>Notifications</SheetTitle>
          <SheetDescription>New orders and likes from your website.</SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto">
          {bell.items.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">
              {bell.status === "loading" ? "Loading…" : "No notifications yet."}
            </p>
          ) : (
            <ul className="divide-y divide-border" data-testid="notification-list">
              {bell.items.map((n) => {
                const Icon = n.kind === "order" ? ShoppingBag : Heart;
                return (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setOpen(false);
                        void openNotification(n);
                      }}
                      className={cn("flex w-full gap-3 px-5 py-3.5 text-left transition-colors hover:bg-muted", !n.read && "bg-primary/[0.04]")}
                    >
                      <span
                        className={cn(
                          "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full",
                          n.kind === "order" ? "bg-gold-soft text-gold-foreground" : "bg-rose-50 text-rose-600",
                        )}
                      >
                        <Icon className="size-4" aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className={cn("truncate text-sm", n.read ? "font-medium" : "font-bold")}>{n.title}</span>
                          {!n.read && <span className="size-2 shrink-0 rounded-full bg-booked" aria-label="unread" />}
                        </span>
                        <span className="mt-0.5 line-clamp-2 block text-sm text-muted-foreground">{n.body}</span>
                        <span className="mt-1 block text-xs text-muted-foreground">{timeAgo(n.createdAt)}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        {bell.unread > 0 && (
          <div className="border-t border-border p-3">
            <Button type="button" variant="outline" className="w-full" onClick={() => void markRead(null)}>
              <CheckCheck /> Mark all as read
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
