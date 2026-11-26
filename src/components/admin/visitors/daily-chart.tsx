"use client";

import { useId, useState } from "react";
import { formatCount } from "@/lib/format";
import { cn } from "@/lib/utils";

type Day = { day: string; visitors: number; pageViews: number };

const shortDate = new Intl.DateTimeFormat("en-PK", { day: "numeric", month: "short", timeZone: "UTC" });
const longDate = new Intl.DateTimeFormat("en-PK", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
const toDate = (day: string) => new Date(`${day}T00:00:00Z`);

/** Clean axis steps: 1, 2, 5 × 10ⁿ. */
function niceScale(max: number): { top: number; ticks: number[] } {
  if (max <= 0) return { top: 4, ticks: [0, 2, 4] };
  const raw = max / 3;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const step = Math.max(1, [1, 2, 5, 10].map((m) => m * magnitude).find((s) => s >= raw) ?? 10 * magnitude);
  const top = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let t = 0; t <= top + 1e-9; t += step) ticks.push(Math.round(t));
  return { top, ticks };
}

/**
 * Daily visitors as columns (one series, so no legend — the heading names it).
 * Hover, tap or use ←/→ keys for exact numbers; a table view is below.
 */
export function DailyVisitorsChart({ data }: { data: Day[] }) {
  const [active, setActive] = useState<number | null>(null);
  const descriptionId = useId();
  const max = Math.max(0, ...data.map((d) => d.visitors));
  const { top, ticks } = niceScale(max);
  const n = data.length;
  const empty = max === 0;
  const activeDay = active !== null ? data[active] : null;

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!n) return;
    if (e.key === "ArrowLeft" || e.key === "ArrowRight" || e.key === "Home" || e.key === "End") {
      e.preventDefault();
      setActive((current) => {
        const from = current ?? n - 1;
        if (e.key === "Home") return 0;
        if (e.key === "End") return n - 1;
        return Math.min(n - 1, Math.max(0, from + (e.key === "ArrowLeft" ? -1 : 1)));
      });
    }
  };

  const tooltipAlign =
    active === null ? "" : active < n * 0.2 ? "left-0" : active > n * 0.8 ? "right-0" : "-translate-x-1/2";
  const tooltipLeft =
    active === null || active < n * 0.2 || active > n * 0.8 ? undefined : `${((active + 0.5) / n) * 100}%`;

  return (
    <div>
      <div className="flex gap-2">
        {/* Y axis */}
        <div className="relative h-52 w-9 shrink-0 text-right text-xs tabular-nums text-muted-foreground" aria-hidden="true">
          {ticks.map((t) => (
            <span key={t} className="absolute right-0 translate-y-1/2" style={{ bottom: `${(t / top) * 100}%` }}>
              {formatCount(t)}
            </span>
          ))}
        </div>

        {/* Plot */}
        <div
          className="relative h-52 min-w-0 flex-1 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
          tabIndex={0}
          role="group"
          aria-label="Visitors per day chart"
          aria-describedby={descriptionId}
          onKeyDown={onKeyDown}
          onFocus={() => setActive((a) => a ?? n - 1)}
          onBlur={() => setActive(null)}
          onPointerLeave={() => setActive(null)}
        >
          <p id={descriptionId} className="sr-only">
            Use the left and right arrow keys to read each day. The same numbers are in the table below the chart.
          </p>
          {ticks.map((t) => (
            <div
              key={t}
              className="absolute inset-x-0 border-t border-border"
              style={{ bottom: `${(t / top) * 100}%` }}
              aria-hidden="true"
            />
          ))}

          <div className="absolute inset-0 flex items-end gap-[2px]" aria-hidden="true">
            {data.map((d, i) => (
              <div
                key={d.day}
                className="flex h-full min-w-0 flex-1 cursor-default items-end justify-center"
                onPointerEnter={() => setActive(i)}
                onPointerDown={() => setActive(i)}
              >
                {d.visitors > 0 && (
                  <div
                    className={cn(
                      "w-full max-w-6 rounded-t-[4px] bg-chart transition-opacity",
                      active !== null && active !== i && "opacity-55",
                    )}
                    style={{ height: `${(d.visitors / top) * 100}%` }}
                  />
                )}
              </div>
            ))}
          </div>

          {empty && (
            <p className="absolute inset-0 flex items-center justify-center px-4 text-center text-sm text-muted-foreground">
              No visits recorded in this period yet.
            </p>
          )}

          {activeDay && (
            <div
              className={cn(
                "pointer-events-none absolute -top-2 z-10 w-max -translate-y-full rounded-lg border border-border bg-popover px-3 py-2 text-sm shadow-lift",
                tooltipAlign,
              )}
              style={{ left: tooltipLeft }}
              role="status"
            >
              <p className="text-xs text-muted-foreground">{longDate.format(toDate(activeDay.day))}</p>
              <p className="mt-0.5 flex items-center gap-2">
                <span className="h-0.5 w-3 rounded-full bg-chart" aria-hidden="true" />
                <strong className="font-bold">{formatCount(activeDay.visitors)}</strong>
                <span className="text-muted-foreground">{activeDay.visitors === 1 ? "visitor" : "visitors"}</span>
              </p>
              <p className="pl-5 text-xs text-muted-foreground">
                {formatCount(activeDay.pageViews)} page {activeDay.pageViews === 1 ? "view" : "views"}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* X axis */}
      {n > 0 && (
        <div className="mt-2 flex justify-between pl-11 text-xs text-muted-foreground" aria-hidden="true">
          <span>{shortDate.format(toDate(data[0].day))}</span>
          {n > 2 && <span>{shortDate.format(toDate(data[Math.floor((n - 1) / 2)].day))}</span>}
          <span>Today</span>
        </div>
      )}

      <details className="mt-4 text-sm">
        <summary className="cursor-pointer font-medium text-primary hover:underline">Show daily numbers</summary>
        <div className="mt-3 max-h-72 overflow-y-auto rounded-xl border border-border">
          <table className="w-full text-left">
            <caption className="sr-only">Visitors and page views per day</caption>
            <thead className="sticky top-0 bg-muted text-xs text-muted-foreground">
              <tr>
                <th scope="col" className="px-3 py-2 font-medium">Date</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">Visitors</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">Page views</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border tabular-nums">
              {[...data].reverse().map((d) => (
                <tr key={d.day}>
                  <th scope="row" className="px-3 py-2 font-normal">{longDate.format(toDate(d.day))}</th>
                  <td className="px-3 py-2 text-right">{formatCount(d.visitors)}</td>
                  <td className="px-3 py-2 text-right">{formatCount(d.pageViews)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
