import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function Pagination({
  page,
  pageCount,
  hrefFor,
}: {
  page: number;
  pageCount: number;
  hrefFor: (page: number) => string;
}) {
  if (pageCount <= 1) return null;
  const btn =
    "inline-flex h-10 min-w-10 items-center justify-center gap-1 rounded-lg border border-border bg-background px-3 text-sm font-medium transition-colors hover:bg-muted";
  const disabled = "pointer-events-none opacity-40";

  return (
    <nav aria-label="Pagination" className="mt-6 flex items-center justify-between gap-2">
      <Link
        href={hrefFor(page - 1)}
        className={cn(btn, page <= 1 && disabled)}
        aria-disabled={page <= 1}
        tabIndex={page <= 1 ? -1 : undefined}
      >
        <ChevronLeft className="size-4" /> Previous
      </Link>
      <span className="text-sm text-muted-foreground">
        Page <span className="font-semibold text-foreground">{page}</span> of {pageCount}
      </span>
      <Link
        href={hrefFor(page + 1)}
        className={cn(btn, page >= pageCount && disabled)}
        aria-disabled={page >= pageCount}
        tabIndex={page >= pageCount ? -1 : undefined}
      >
        Next <ChevronRight className="size-4" />
      </Link>
    </nav>
  );
}
