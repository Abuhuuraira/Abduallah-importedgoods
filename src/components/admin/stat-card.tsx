import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { formatCount } from "@/lib/format";
import { cn } from "@/lib/utils";

const tones = {
  navy: "bg-primary/10 text-primary",
  green: "bg-success-soft text-success",
  red: "bg-booked-soft text-booked",
  gold: "bg-gold-soft text-gold-foreground",
  slate: "bg-muted text-muted-foreground",
} as const;

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "navy",
  href,
  hint,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  tone?: keyof typeof tones;
  href?: string;
  hint?: string;
}) {
  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", tones[tone])}>
          <Icon className="size-5" aria-hidden="true" />
        </span>
      </div>
      <p className="mt-1 text-3xl font-extrabold tracking-tight">{formatCount(value)}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </>
  );

  const className =
    "block rounded-2xl border border-border/70 bg-card p-4 shadow-soft transition-all sm:p-5";

  return href ? (
    <Link href={href} className={cn(className, "hover:-translate-y-0.5 hover:shadow-lift")}>
      {content}
    </Link>
  ) : (
    <div className={className}>{content}</div>
  );
}
