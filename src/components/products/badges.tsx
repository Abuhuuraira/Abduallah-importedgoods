import { CheckCircle2, Lock, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProductStatus } from "@/types";

export function StatusBadge({
  status,
  className,
  size = "sm",
}: {
  status: ProductStatus;
  className?: string;
  size?: "sm" | "lg";
}) {
  const booked = status === "booked";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-semibold uppercase tracking-wide",
        size === "lg" ? "px-3 py-1.5 text-xs" : "px-2 py-0.5 text-[0.65rem]",
        booked ? "bg-booked text-white" : "bg-success-soft text-success ring-1 ring-success/20",
        className,
      )}
    >
      {booked ? (
        <Lock className={size === "lg" ? "size-3.5" : "size-3"} aria-hidden="true" />
      ) : (
        <CheckCircle2 className={size === "lg" ? "size-3.5" : "size-3"} aria-hidden="true" />
      )}
      {booked ? "Booked" : "Available"}
    </span>
  );
}

export function NewArrivalBadge({ className, size = "sm" }: { className?: string; size?: "sm" | "lg" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-gold font-semibold uppercase tracking-wide text-gold-foreground shadow-sm",
        size === "lg" ? "px-3 py-1.5 text-xs" : "px-2 py-0.5 text-[0.65rem]",
        className,
      )}
    >
      <Sparkles className={size === "lg" ? "size-3.5" : "size-3"} aria-hidden="true" />
      New Arrival
    </span>
  );
}

export function PublicationBadge({ published }: { published: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[0.7rem] font-semibold",
        published ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground ring-1 ring-border",
      )}
    >
      {published ? "Published" : "Draft"}
    </span>
  );
}
