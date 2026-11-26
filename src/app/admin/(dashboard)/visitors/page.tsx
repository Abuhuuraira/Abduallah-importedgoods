import type { Metadata } from "next";
import Link from "next/link";
import { Clock, Eye, Footprints, ShieldCheck, UserPlus, Users } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { StatCard } from "@/components/admin/stat-card";
import { AnalyticsNotInstalled, BreakdownList, TopProducts } from "@/components/admin/visitors/breakdowns";
import { DailyVisitorsChart } from "@/components/admin/visitors/daily-chart";
import { LiveVisitors } from "@/components/admin/visitors/live-visitors";
import { DEVICE_LABELS, formatDuration, parseVisitorRange, sourceLabel, VISITOR_RANGES } from "@/lib/analytics";
import { requireAdmin } from "@/lib/auth";
import { getVisitorLive, getVisitorStats } from "@/lib/data/admin";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Visitors" };

function Panel({ title, description, children, className }: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-2xl border border-border/70 bg-card p-4 shadow-soft sm:p-6", className)}>
      <h2 className="text-base font-bold sm:text-lg">{title}</h2>
      {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default async function VisitorsPage({ searchParams }: PageProps<"/admin/visitors">) {
  await requireAdmin();
  const range = parseVisitorRange((await searchParams).range);
  const [live, stats] = await Promise.all([getVisitorLive(), getVisitorStats(range)]);

  const header = (
    <PageHeader
      title="Visitors"
      description="How many people visit your website, who is on it right now, and which products they look at."
    />
  );

  if (!live.installed || !stats.installed) {
    return (
      <>
        {header}
        <AnalyticsNotInstalled />
      </>
    );
  }

  const s = stats.data;
  const periodLabel = `last ${range} days`;

  return (
    <>
      {header}

      <LiveVisitors initial={live.data} />

      {/* Date range — scopes everything below it */}
      <nav aria-label="Date range" className="mt-8 flex flex-wrap items-center gap-2">
        <span className="mr-1 text-sm font-semibold">Last:</span>
        {VISITOR_RANGES.map((days) => (
          <Link
            key={days}
            href={days === 7 ? "/admin/visitors" : `/admin/visitors?range=${days}`}
            aria-current={days === range ? "page" : undefined}
            scroll={false}
            className={cn(
              "flex h-10 items-center rounded-full border px-3.5 text-sm font-medium transition-colors sm:px-4",
              days === range
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card hover:bg-muted",
            )}
          >
            {days} days
          </Link>
        ))}
      </nav>

      <section aria-label={`Totals for the ${periodLabel}`} className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        <StatCard label="Visitors" value={s.totals.visitors} icon={Users} tone="navy" hint="Different people (devices)" />
        <StatCard label="Visits" value={s.totals.visits} icon={Footprints} tone="navy" hint="Times the website was opened" />
        <StatCard label="Page views" value={s.totals.pageViews} icon={Eye} tone="navy" hint="Pages opened in total" />
        <StatCard label="New visitors" value={s.newVisitors} icon={UserPlus} tone="green" hint="First time on your website" />
        <StatCard label="Time on site" value={formatDuration(s.avgSeconds)} icon={Clock} tone="gold" hint="Average per visit" />
        <StatCard label="Pages per visit" value={s.avgPages.toLocaleString("en-PK", { maximumFractionDigits: 1 })} icon={Eye} tone="slate" hint="Average" />
      </section>

      <Panel title="Visitors per day" description={`Different people each day, ${periodLabel} (Pakistan time).`} className="mt-6">
        <DailyVisitorsChart data={s.daily} />
      </Panel>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Panel title="Most viewed products" description={`Product pages opened, ${periodLabel}.`}>
          <TopProducts products={s.topProducts} />
        </Panel>

        <div className="space-y-6">
          <Panel title="Devices" description="What people use to open your website.">
            <BreakdownList
              items={s.devices.map((d) => ({ key: d.device, label: DEVICE_LABELS[d.device], value: d.visits }))}
              unit={["visit", "visits"]}
              emptyText="No visits in this period yet."
            />
          </Panel>
          <Panel title="Where visitors come from" description="Links opened inside WhatsApp chats usually show as Direct.">
            <BreakdownList
              items={s.sources.map((r) => ({ key: r.source, label: sourceLabel(r.source), value: r.visits }))}
              unit={["visit", "visits"]}
              emptyText="No visits in this period yet."
            />
          </Panel>
        </div>
      </div>

      <p className="mt-6 flex gap-2 rounded-2xl bg-muted/60 p-4 text-xs leading-relaxed text-muted-foreground sm:text-sm">
        <ShieldCheck className="size-4 shrink-0 sm:mt-0.5" aria-hidden="true" />
        <span>
          Visits are counted anonymously — no names, phone numbers or IP addresses are stored, and history older than
          90 days is deleted automatically. Search engines, bots, and your own visits from any device where you have
          opened this admin panel are not counted.
        </span>
      </p>
    </>
  );
}
