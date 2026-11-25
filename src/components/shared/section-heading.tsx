import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function SectionHeading({
  eyebrow,
  title,
  description,
  href,
  linkLabel = "View all",
  id,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  href?: string;
  linkLabel?: string;
  id?: string;
  className?: string;
}) {
  return (
    <div className={cn("mb-5 flex items-end justify-between gap-4 sm:mb-6", className)}>
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-gold-foreground/80">{eyebrow}</p>
        )}
        <h2 id={id} className="text-xl font-bold text-foreground sm:text-2xl lg:text-3xl">
          {title}
        </h2>
        {description && <p className="mt-1 text-sm text-muted-foreground sm:text-base">{description}</p>}
      </div>
      {href && (
        <Link
          href={href}
          className="group inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-2 text-sm font-semibold text-primary hover:bg-muted"
        >
          {linkLabel}
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}
