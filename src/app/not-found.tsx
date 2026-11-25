import type { Metadata } from "next";
import Link from "next/link";
import { Compass, Home, LayoutGrid } from "lucide-react";
import { HeaderSearch } from "@/components/site/header-search";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <main className="flex flex-1 items-center justify-center bg-surface px-4 py-16">
      <div className="w-full max-w-lg rounded-3xl border border-border/70 bg-card p-8 text-center shadow-soft sm:p-10">
        <span className="mx-auto mb-5 flex size-16 items-center justify-center rounded-2xl bg-navy text-gold">
          <Compass className="size-8" aria-hidden="true" />
        </span>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">Error 404</p>
        <h1 className="mt-2 text-2xl font-bold sm:text-3xl">We couldn&apos;t find that page</h1>
        <p className="mt-2 text-muted-foreground">
          The link may be broken or the page may have been removed. Try searching for a product instead.
        </p>
        <HeaderSearch className="mt-6" />
        <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
          <Button asChild size="lg">
            <Link href="/">
              <Home /> Homepage
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/products">
              <LayoutGrid /> All products
            </Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
