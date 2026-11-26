"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Eye, RefreshCw, Users } from "lucide-react";
import { formatCount } from "@/lib/format";
import { pageLabel, parseVisitorLive, type VisitorLive } from "@/lib/analytics";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const REFRESH_MS = 15_000;

const timeFormatter = new Intl.DateTimeFormat("en-PK", {
  hour: "numeric",
  minute: "2-digit",
  second: "2-digit",
  timeZone: "Asia/Karachi",
});

/** Polls get_visitor_live while this tab is visible. RLS + is_admin() guard the data. */
function useLiveVisitors(initial: VisitorLive) {
  const [live, setLive] = useState(initial);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let busy = false;
    const supabase = getSupabaseBrowserClient();

    const refresh = async () => {
      if (busy || document.visibilityState !== "visible") return;
      busy = true;
      try {
        const { data, error } = await supabase.rpc("get_visitor_live");
        if (cancelled) return;
        if (error) {
          setFailed(true);
        } else {
          setFailed(false);
          setLive(parseVisitorLive(data));
        }
      } catch {
        if (!cancelled) setFailed(true);
      } finally {
        busy = false;
      }
    };

    const timer = window.setInterval(refresh, REFRESH_MS);
    const onVisibility = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return { live, failed };
}

function LiveDot({ active }: { active: boolean }) {
  return (
    <span className="relative flex size-3" aria-hidden="true">
      {active && <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-60" />}
      <span className={cn("relative inline-flex size-3 rounded-full", active ? "bg-success" : "bg-muted-foreground/40")} />
    </span>
  );
}

function UpdatedAt({ live, failed }: { live: VisitorLive; failed: boolean }) {
  return (
    <p className="flex items-center gap-1.5 text-xs text-muted-foreground" aria-live="polite">
      <RefreshCw className="size-3.5" aria-hidden="true" />
      {failed ? (
        <span className="text-amber-700">Couldn’t refresh — trying again shortly.</span>
      ) : (
        <span>
          Updates every 15 seconds · last checked{" "}
          <time dateTime={live.checkedAt} suppressHydrationWarning>
            {timeFormatter.format(new Date(live.checkedAt))}
          </time>
        </span>
      )}
    </p>
  );
}

/** Full card for Admin → Visitors. */
export function LiveVisitors({ initial }: { initial: VisitorLive }) {
  const { live, failed } = useLiveVisitors(initial);

  return (
    <section
      aria-labelledby="live-heading"
      className="rounded-2xl border border-border/70 bg-card p-4 shadow-soft sm:p-6"
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <div>
          <h2 id="live-heading" className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <LiveDot active={live.activeNow > 0} />
            Active right now
          </h2>
          <p className="mt-2 text-6xl font-extrabold tracking-tight" data-testid="active-now">
            {formatCount(live.activeNow)}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {live.activeNow === 1 ? "person is" : "people are"} using your website now
          </p>

          <dl className="mt-5 grid grid-cols-3 gap-3 border-t border-border pt-4">
            <div>
              <dt className="text-xs text-muted-foreground">Last 30 min</dt>
              <dd className="mt-0.5 text-xl font-bold">{formatCount(live.last30Minutes)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Visitors today</dt>
              <dd className="mt-0.5 text-xl font-bold" data-testid="today-visitors">{formatCount(live.todayVisitors)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Page views today</dt>
              <dd className="mt-0.5 text-xl font-bold">{formatCount(live.todayPageViews)}</dd>
            </div>
          </dl>
        </div>

        <div className="min-w-0">
          <h3 className="text-sm font-semibold">What they are looking at</h3>
          {live.pages.length === 0 ? (
            <p className="mt-3 rounded-xl bg-muted/60 px-4 py-6 text-center text-sm text-muted-foreground">
              Nobody is on the website right now.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-border rounded-xl border border-border" data-testid="live-pages">
              {live.pages.map((page) => (
                <li key={page.path} className="flex items-center gap-3 px-3 py-2.5 text-sm">
                  <Eye className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <a
                      href={page.path}
                      target="_blank"
                      rel="noreferrer"
                      className="block truncate font-medium hover:underline"
                    >
                      {pageLabel(page.path, page.productName)}
                    </a>
                    {page.productCode && (
                      <span className="block text-xs text-muted-foreground">{page.productCode}</span>
                    )}
                  </span>
                  <span className="shrink-0 tabular-nums font-semibold">
                    {formatCount(page.visitors)}
                    <span className="sr-only"> {page.visitors === 1 ? "person" : "people"}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <div className="mt-5 border-t border-border pt-3">
        <UpdatedAt live={live} failed={failed} />
      </div>
    </section>
  );
}

/** Small summary for the dashboard home page. */
export function LiveVisitorsSummary({ initial }: { initial: VisitorLive }) {
  const { live, failed } = useLiveVisitors(initial);

  return (
    <section
      aria-labelledby="visitors-summary-heading"
      className="rounded-2xl border border-border/70 bg-card p-4 shadow-soft sm:p-5"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 id="visitors-summary-heading" className="flex items-center gap-2 font-bold">
          <Users className="size-5 text-muted-foreground" aria-hidden="true" />
          Website visitors
        </h2>
        <Link
          href="/admin/visitors"
          className="flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
        >
          Details <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
      <dl className="mt-4 grid grid-cols-3 gap-3">
        <div>
          <dt className="flex items-center gap-1.5 text-xs text-muted-foreground sm:text-sm">
            <LiveDot active={live.activeNow > 0} /> Active now
          </dt>
          <dd className="mt-1 text-3xl font-extrabold tracking-tight" data-testid="summary-active-now">
            {formatCount(live.activeNow)}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground sm:text-sm">Visitors today</dt>
          <dd className="mt-1 text-3xl font-extrabold tracking-tight">{formatCount(live.todayVisitors)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground sm:text-sm">Page views today</dt>
          <dd className="mt-1 text-3xl font-extrabold tracking-tight">{formatCount(live.todayPageViews)}</dd>
        </div>
      </dl>
      <div className="mt-4 border-t border-border pt-3">
        <UpdatedAt live={live} failed={failed} />
      </div>
    </section>
  );
}
