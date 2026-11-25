"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckCircle2, ChevronRight, Home, LayoutGrid, Menu, Sparkles } from "lucide-react";
import { WhatsAppIcon } from "@/components/icons/whatsapp-icon";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

type MobileNavProps = {
  businessName: string;
  categories: { slug: string; name: string; product_count: number }[];
  whatsappUrl: string | null;
};

export function MobileNav({ businessName, categories, whatsappUrl }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  const mainLinks = [
    { href: "/", label: "Home", icon: Home },
    { href: "/products", label: "All Products", icon: LayoutGrid },
    { href: "/products?new=1", label: "New Arrivals", icon: Sparkles },
    { href: "/products?available=1", label: "Available Now", icon: CheckCircle2 },
  ];

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
          <Menu className="size-6" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[86vw] max-w-sm gap-0 overflow-y-auto p-0">
        <SheetHeader className="border-b border-border p-5">
          <SheetTitle className="text-left text-lg">{businessName}</SheetTitle>
          <SheetDescription className="text-left">Wholesale imported goods</SheetDescription>
        </SheetHeader>
        <nav aria-label="Main" className="p-3">
          <ul className="space-y-1">
            {mainLinks.map(({ href, label, icon: Icon }) => (
              <li key={href}>
                <Link
                  href={href}
                  onClick={close}
                  className="flex h-12 items-center gap-3 rounded-xl px-3 text-[0.95rem] font-medium text-foreground hover:bg-muted"
                >
                  <Icon className="size-5 text-muted-foreground" aria-hidden="true" />
                  {label}
                </Link>
              </li>
            ))}
          </ul>
          {categories.length > 0 && (
            <>
              <p className="mt-5 mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Categories
              </p>
              <ul className="space-y-0.5">
                {categories.map((c) => (
                  <li key={c.slug}>
                    <Link
                      href={`/products?category=${c.slug}`}
                      onClick={close}
                      className="flex h-11 items-center justify-between rounded-xl px-3 text-sm text-foreground hover:bg-muted"
                    >
                      <span className="truncate">{c.name}</span>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        {c.product_count}
                        <ChevronRight className="size-4" aria-hidden="true" />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </nav>
        {whatsappUrl && (
          <div className="mt-auto border-t border-border p-4">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-12 items-center justify-center gap-2 rounded-xl bg-whatsapp font-semibold text-white hover:bg-whatsapp-hover"
            >
              <WhatsAppIcon className="size-5" /> Chat on WhatsApp
            </a>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
