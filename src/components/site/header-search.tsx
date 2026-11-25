import Form from "next/form";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

/** GET form → /products?q=… (works without JavaScript; client-side navigation with it). */
export function HeaderSearch({
  className,
  autoFocus = false,
  id = "site-search",
}: {
  className?: string;
  autoFocus?: boolean;
  /** Must be unique on the page (the header renders a desktop and a mobile copy). */
  id?: string;
}) {
  return (
    <Form action="/products" role="search" className={cn("relative w-full", className)}>
      <label htmlFor={id} className="sr-only">
        Search products
      </label>
      <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
      <input
        id={id}
        type="search"
        name="q"
        placeholder="Search products, IDs, categories…"
        maxLength={100}
        enterKeyHint="search"
        autoComplete="off"
        autoFocus={autoFocus}
        className="h-11 w-full rounded-xl border border-input bg-surface pr-24 pl-10 text-base text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-ring focus:bg-background focus:ring-3 focus:ring-ring/30 md:text-sm"
      />
      <button
        type="submit"
        className="absolute top-1/2 right-1.5 h-8 -translate-y-1/2 rounded-lg bg-primary px-3.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/85"
      >
        Search
      </button>
    </Form>
  );
}
