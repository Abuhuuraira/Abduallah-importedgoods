import type { LucideIcon } from "lucide-react";
import { PackageSearch } from "lucide-react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon = PackageSearch,
  title,
  description,
  children,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-surface px-6 py-12 text-center",
        className,
      )}
    >
      <span className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-background text-muted-foreground shadow-soft">
        <Icon className="size-7" aria-hidden="true" />
      </span>
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      {description && <p className="mt-1.5 max-w-md text-sm text-muted-foreground">{description}</p>}
      {children && <div className="mt-5 flex flex-wrap items-center justify-center gap-2">{children}</div>}
    </div>
  );
}
