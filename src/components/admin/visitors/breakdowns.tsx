import Link from "next/link";
import { Database } from "lucide-react";
import { formatCount } from "@/lib/format";
import type { VisitorStats } from "@/lib/analytics";
import { cn } from "@/lib/utils";

/** Horizontal bars: label + share, bar grows from the left baseline. */
export function BreakdownList({
  items,
  unit,
  emptyText,
}: {
  items: { key: string; label: string; value: number }[];
  unit: [singular: string, plural: string];
  emptyText: string;
}) {
  const total = items.reduce((sum, item) => sum + item.value, 0);
  const max = Math.max(0, ...items.map((item) => item.value));
  if (total === 0) return <p className="py-4 text-sm text-muted-foreground">{emptyText}</p>;

  return (
    <ul className="space-y-3.5">
      {items.map((item) => {
        const share = Math.round((item.value / total) * 100);
        return (
          <li key={item.key}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="min-w-0 truncate font-medium">{item.label}</span>
              <span className="shrink-0 tabular-nums text-muted-foreground">
                <span className="font-semibold text-foreground">{share}%</span> · {formatCount(item.value)} {item.value === 1 ? unit[0] : unit[1]}
              </span>
            </div>
            <div className="mt-1.5 h-2" aria-hidden="true">
              <div
                className="h-full rounded-r-[4px] bg-chart"
                style={{ width: `${Math.max(1, (item.value / max) * 100)}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function TopProducts({ products }: { products: VisitorStats["topProducts"] }) {
  if (products.length === 0) {
    return (
      <p className="py-4 text-sm text-muted-foreground">
        No product pages were opened in this period yet.
      </p>
    );
  }
  const max = Math.max(...products.map((p) => p.views));

  return (
    <ol className="divide-y divide-border" data-testid="top-products">
      {products.map((p, i) => (
        <li key={p.id} className="flex items-center gap-3 py-3">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
            {i + 1}
          </span>
          <div className="min-w-0 flex-1">
            <Link href={`/admin/products/${p.id}/edit`} className="block truncate text-sm font-semibold hover:underline">
              {p.name}
            </Link>
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{p.productCode}</span>
              <span
                className={cn(
                  "rounded-full px-1.5 py-px text-[11px] font-semibold",
                  p.status === "booked" ? "bg-booked-soft text-booked" : "bg-success-soft text-success",
                )}
              >
                {p.status === "booked" ? "Booked" : "Available"}
              </span>
            </p>
            <div className="mt-1.5 h-1.5" aria-hidden="true">
              <div className="h-full rounded-r-[4px] bg-chart" style={{ width: `${Math.max(2, (p.views / max) * 100)}%` }} />
            </div>
          </div>
          <div className="shrink-0 text-right text-sm tabular-nums">
            <p className="font-bold">
              {formatCount(p.views)} <span className="font-normal text-muted-foreground">{p.views === 1 ? "view" : "views"}</span>
            </p>
            <p className="text-xs text-muted-foreground">
              {formatCount(p.visitors)} {p.visitors === 1 ? "person" : "people"}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function AnalyticsNotInstalled() {
  return (
    <div className="rounded-2xl border border-amber-300 bg-amber-50 p-5 text-amber-950 sm:p-6" role="alert">
      <h2 className="flex items-center gap-2 text-lg font-bold">
        <Database className="size-5" aria-hidden="true" />
        One more step to turn on visitor statistics
      </h2>
      <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm leading-relaxed">
        <li>Open your project at supabase.com → <strong>SQL Editor</strong> → <strong>New query</strong>.</li>
        <li>
          Open the file <code className="rounded bg-white px-1 py-0.5 text-xs">supabase/migrations/20261126000000_visitor_analytics.sql</code>,
          copy everything, paste it in and press <strong>Run</strong>.
        </li>
        <li>Come back here and reload the page. Visits are counted from that moment on.</li>
      </ol>
    </div>
  );
}
