import Image from "next/image";
import { cn } from "@/lib/utils";

function initials(name: string): string {
  const words = name.split(/\s+/).filter(Boolean);
  const letters = words.slice(0, 3).map((w) => w[0]?.toUpperCase() ?? "");
  return letters.join("") || "AIG";
}

type BrandLogoProps = {
  name: string;
  logoUrl?: string | null;
  className?: string;
  showName?: boolean;
  tagline?: string;
  size?: "sm" | "md" | "lg";
  /** Use on dark backgrounds (e.g. the footer). */
  inverted?: boolean;
};

/** Business logo (uploaded image) with a monogram fallback. */
export function BrandLogo({
  name,
  logoUrl,
  className,
  showName = true,
  tagline,
  size = "md",
  inverted = false,
}: BrandLogoProps) {
  const box = size === "lg" ? "size-14 text-lg" : size === "sm" ? "size-9 text-xs" : "size-11 text-sm";
  return (
    <span className={cn("flex min-w-0 items-center gap-2.5", className)}>
      <span
        className={cn(
          "relative flex shrink-0 items-center justify-center overflow-hidden rounded-xl font-bold tracking-wider",
          logoUrl
            ? "bg-white ring-1 ring-border"
            : inverted
              ? "bg-white/10 text-gold ring-1 ring-white/20"
              : "bg-navy text-gold shadow-soft",
          box,
        )}
      >
        {logoUrl ? (
          <Image src={logoUrl} alt={`${name} logo`} fill sizes="56px" className="object-contain p-1" />
        ) : (
          <span aria-hidden="true">{initials(name)}</span>
        )}
      </span>
      {showName && (
        <span className="flex min-w-0 flex-col leading-tight">
          <span
            className={cn(
              "truncate font-heading text-[0.95rem] font-bold sm:text-base",
              inverted ? "text-white" : "text-foreground",
            )}
          >
            {name}
          </span>
          {tagline && (
            <span
              className={cn(
                "truncate text-[0.7rem] font-medium uppercase tracking-[0.14em]",
                inverted ? "text-white/60" : "text-muted-foreground",
              )}
            >
              {tagline}
            </span>
          )}
        </span>
      )}
    </span>
  );
}
