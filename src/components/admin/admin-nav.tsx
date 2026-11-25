"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ExternalLink, LayoutDashboard, Layers, Menu, Package, PlusCircle, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export const ADMIN_LINKS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/products", label: "Products", icon: Package, exact: false },
  { href: "/admin/products/new", label: "Add Product", icon: PlusCircle, exact: true },
  { href: "/admin/categories", label: "Categories", icon: Layers, exact: false },
  { href: "/admin/settings", label: "Settings", icon: Settings, exact: false },
] as const;

function isActive(pathname: string, href: string, exact: boolean) {
  if (exact) return pathname === href;
  if (href === "/admin/products") {
    return pathname.startsWith("/admin/products") && pathname !== "/admin/products/new";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Pure list — rendered with an empty pathname as the static fallback. */
export function AdminNavList({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav aria-label="Admin" className="flex flex-col gap-1">
      {ADMIN_LINKS.map(({ href, label, icon: Icon, exact }) => {
        const active = isActive(pathname, href, exact);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors",
              active ? "bg-primary text-primary-foreground shadow-soft" : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="size-5" aria-hidden="true" />
            {label}
          </Link>
        );
      })}
      <Link
        href="/"
        target="_blank"
        onClick={onNavigate}
        className="mt-2 flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <ExternalLink className="size-5" aria-hidden="true" />
        View website
      </Link>
    </nav>
  );
}

export function AdminNav() {
  const pathname = usePathname();
  return <AdminNavList pathname={pathname} />;
}

export function AdminMobileMenu({ footer }: { footer?: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Open admin menu">
          <Menu className="size-6" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[84vw] max-w-xs gap-0 p-0">
        <SheetHeader className="border-b border-border p-5">
          <SheetTitle className="text-left">Admin panel</SheetTitle>
          <SheetDescription className="text-left">Manage your catalog</SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto p-3">
          <AdminNavList pathname={pathname} onNavigate={() => setOpen(false)} />
        </div>
        {footer && <div className="border-t border-border p-3">{footer}</div>}
      </SheetContent>
    </Sheet>
  );
}
