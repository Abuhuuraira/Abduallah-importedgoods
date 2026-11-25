import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Plus, ShieldCheck } from "lucide-react";
import { AdminMobileMenu, AdminNav, AdminNavList } from "@/components/admin/admin-nav";
import { AdminUser } from "@/components/admin/admin-user";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: { default: "Admin Dashboard", template: "%s · Admin" },
  robots: { index: false, follow: false },
};

/**
 * Admin shell. The chrome is static; every page inside verifies the session
 * and admin role on the server (requireAdmin) before loading any data.
 */
export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="min-h-dvh bg-surface lg:flex">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-border bg-background lg:flex">
        <div className="flex h-16 items-center gap-2.5 border-b border-border px-5">
          <span className="flex size-9 items-center justify-center rounded-xl bg-navy text-gold">
            <ShieldCheck className="size-5" aria-hidden="true" />
          </span>
          <span className="leading-tight">
            <span className="block text-sm font-bold">Admin Panel</span>
            <span className="block text-xs text-muted-foreground">Catalog management</span>
          </span>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          <Suspense fallback={<AdminNavList pathname="" />}>
            <AdminNav />
          </Suspense>
        </div>
        <div className="border-t border-border p-3">
          <Suspense fallback={<Skeleton className="h-10 w-full" />}>
            <AdminUser />
          </Suspense>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-background/95 px-2 backdrop-blur lg:hidden">
          <Suspense fallback={<span className="size-10" />}>
            <AdminMobileMenu
              footer={
                <Suspense fallback={<Skeleton className="h-10 w-full" />}>
                  <AdminUser />
                </Suspense>
              }
            />
          </Suspense>
          <span className="flex-1 truncate text-sm font-bold">Admin Panel</span>
          <Button asChild size="sm" className="mr-1">
            <Link href="/admin/products/new">
              <Plus /> Add
            </Link>
          </Button>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
