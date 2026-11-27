"use client";

import Image from "next/image";
import { useId, useState, useTransition } from "react";
import { Banknote, CheckCircle2, Loader2, Minus, Plus, Truck } from "lucide-react";
import { WhatsAppIcon } from "@/components/icons/whatsapp-icon";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { placeOrderAction, type PlacedOrder } from "@/lib/actions/storefront";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import { readStorage, writeStorage } from "@/lib/visitor-id";
import { buildWhatsAppUrl, formatWhatsAppNumberForDisplay, isValidWhatsAppNumber } from "@/lib/whatsapp";
import type { ActionResult } from "@/types";

type Props = {
  product: { id: string; name: string; product_code: string; price: number | null; image_url: string };
  currency: string;
  shopWhatsapp: string;
  /** "full" = big button on the product page, "compact" = sticky phone bar. */
  variant?: "full" | "compact";
};

type SavedCustomer = { name: string; whatsapp: string; address: string };
const CUSTOMER_KEY = "aig_customer";

function loadCustomer(): SavedCustomer {
  try {
    const raw = JSON.parse(readStorage(CUSTOMER_KEY) ?? "{}") as Partial<SavedCustomer>;
    return {
      name: typeof raw.name === "string" ? raw.name : "",
      whatsapp: typeof raw.whatsapp === "string" ? raw.whatsapp : "",
      address: typeof raw.address === "string" ? raw.address : "",
    };
  } catch {
    return { name: "", whatsapp: "", address: "" };
  }
}

export function OrderDialog({ product, currency, shopWhatsapp, variant = "full" }: Props) {
  const formId = useId();
  const [open, setOpen] = useState(false);
  const [openCount, setOpenCount] = useState(0);
  const [saved, setSaved] = useState<SavedCustomer>({ name: "", whatsapp: "", address: "" });
  const [quantity, setQuantity] = useState(1);
  const [result, setResult] = useState<ActionResult<PlacedOrder> | null>(null);
  // Fields the customer changed since the last attempt — their old error is hidden.
  const [edited, setEdited] = useState<ReadonlySet<string>>(new Set());
  const [pending, startTransition] = useTransition();

  const placed = result?.ok ? result.data : undefined;
  const allErrors = result && !result.ok ? result.fieldErrors ?? {} : {};
  const errors = Object.fromEntries(Object.entries(allErrors).filter(([field]) => !edited.has(field)));
  const total = product.price === null ? null : product.price * quantity;

  const onOpenChange = (next: boolean) => {
    if (pending) return;
    if (next) {
      setSaved(loadCustomer());
      setQuantity(1);
      setResult(null);
      setEdited(new Set());
      setOpenCount((c) => c + 1);
    }
    setOpen(next);
  };

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setEdited(new Set());
    startTransition(async () => {
      const response = await placeOrderAction(null, formData);
      setResult(response);
      if (response.ok) {
        writeStorage(
          CUSTOMER_KEY,
          JSON.stringify({
            name: String(formData.get("name") ?? "").trim(),
            whatsapp: String(formData.get("whatsapp") ?? "").trim(),
            address: String(formData.get("address") ?? "").trim(),
          }),
        );
      }
    });
  };

  const fieldError = (name: string) =>
    errors[name]?.[0] ? (
      <p id={`${formId}-${name}-error`} className="text-sm font-medium text-destructive">
        {errors[name]?.[0]}
      </p>
    ) : null;
  const describedBy = (name: string) => (errors[name]?.[0] ? `${formId}-${name}-error` : undefined);

  const trigger =
    variant === "full" ? (
      <button
        type="button"
        data-testid="order-cod"
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 text-[0.95rem] font-bold uppercase tracking-wide text-primary-foreground shadow-soft transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <Banknote className="size-5" aria-hidden="true" /> Order now · Cash on Delivery
      </button>
    ) : (
      <button
        type="button"
        data-testid="order-cod-compact"
        className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold uppercase tracking-wide text-primary-foreground hover:bg-primary/90"
      >
        <Banknote className="size-5" aria-hidden="true" /> Order (COD)
      </button>
    );

  const shopLink =
    placed && isValidWhatsAppNumber(shopWhatsapp)
      ? buildWhatsAppUrl(
          shopWhatsapp,
          `Assalam o Alaikum, I just placed order ${placed.orderLabel} for ${product.name} (${product.product_code}) × ${placed.quantity}.`,
        )
      : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[92dvh] gap-0 overflow-y-auto p-0 sm:max-w-lg">
        {placed ? (
          <div className="p-6 text-center" data-testid="order-success">
            <CheckCircle2 className="mx-auto size-14 text-success" aria-hidden="true" />
            <DialogHeader className="mt-3 items-center">
              <DialogTitle className="text-2xl">Order placed!</DialogTitle>
              <DialogDescription className="text-base">
                Your order number is{" "}
                <strong className="font-mono text-foreground" data-testid="order-number">
                  {placed.orderLabel}
                </strong>
              </DialogDescription>
            </DialogHeader>
            <p className="mt-4 rounded-xl bg-surface p-4 text-sm leading-relaxed text-muted-foreground">
              We will contact you on WhatsApp at{" "}
              <strong className="text-foreground">{formatWhatsAppNumberForDisplay(placed.whatsapp)}</strong> to confirm
              your order. Pay cash when it arrives.
            </p>
            <div className="mt-5 grid gap-2">
              {shopLink && (
                <a
                  href={shopLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border-2 border-whatsapp px-4 text-sm font-bold text-whatsapp hover:bg-success-soft"
                >
                  <WhatsAppIcon className="size-5" /> Message us on WhatsApp
                </a>
              )}
              <Button type="button" size="lg" className="h-12" onClick={() => onOpenChange(false)}>
                Done
              </Button>
            </div>
          </div>
        ) : (
          <form
            onSubmit={onSubmit}
            onChange={(e) => {
              const target = e.target as unknown as { name?: string };
              const name = target.name ?? "";
              if (name && allErrors[name] && !edited.has(name)) setEdited((prev) => new Set(prev).add(name));
            }}
            noValidate
            key={openCount}
            aria-busy={pending}
          >
            <DialogHeader className="border-b border-border p-5 pr-12">
              <DialogTitle className="flex items-center gap-2 text-lg">
                <Truck className="size-5 text-muted-foreground" aria-hidden="true" /> Order with Cash on Delivery
              </DialogTitle>
              <DialogDescription>Fill in your details. You pay when the product is delivered.</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 p-5">
              <div className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3">
                <div className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-background">
                  <Image src={product.image_url} alt="" fill sizes="56px" className="object-cover" />
                </div>
                <div className="min-w-0">
                  <p className="truncate font-semibold">{product.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {product.product_code} · {formatPrice(product.price, currency)}
                  </p>
                </div>
              </div>

              <input type="hidden" name="productId" value={product.id} />
              {/* Spam trap: hidden from people, bots fill it in. */}
              <div className="absolute -left-[9999px] h-px w-px overflow-hidden" aria-hidden="true">
                <label>
                  Leave this empty
                  <input type="text" name="hp_field_7c" tabIndex={-1} autoComplete="off" defaultValue="" />
                </label>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor={`${formId}-name`}>Your name *</Label>
                <Input
                  id={`${formId}-name`}
                  name="name"
                  autoComplete="name"
                  required
                  maxLength={80}
                  defaultValue={saved.name}
                  aria-invalid={Boolean(errors.name)}
                  aria-describedby={describedBy("name")}
                  className="h-11"
                />
                {fieldError("name")}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor={`${formId}-whatsapp`}>WhatsApp number *</Label>
                <Input
                  id={`${formId}-whatsapp`}
                  name="whatsapp"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="0300 1234567"
                  required
                  maxLength={20}
                  defaultValue={saved.whatsapp}
                  aria-invalid={Boolean(errors.whatsapp)}
                  aria-describedby={describedBy("whatsapp")}
                  className="h-11"
                />
                {fieldError("whatsapp")}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor={`${formId}-address`}>Delivery address *</Label>
                <Textarea
                  id={`${formId}-address`}
                  name="address"
                  autoComplete="street-address"
                  placeholder="House no., street, area, city"
                  required
                  rows={3}
                  maxLength={500}
                  defaultValue={saved.address}
                  aria-invalid={Boolean(errors.address)}
                  aria-describedby={describedBy("address")}
                />
                {fieldError("address")}
              </div>

              <div className="grid grid-cols-[auto_1fr] items-end gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor={`${formId}-quantity`}>Quantity</Label>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-lg"
                      aria-label="Decrease quantity"
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      disabled={quantity <= 1}
                    >
                      <Minus />
                    </Button>
                    <Input
                      id={`${formId}-quantity`}
                      name="quantity"
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={9999}
                      value={quantity}
                      onChange={(e) => {
                        const n = Number.parseInt(e.target.value, 10);
                        if (allErrors.quantity) setEdited((prev) => new Set(prev).add("quantity"));
                        setQuantity(Number.isFinite(n) ? Math.min(9999, Math.max(1, n)) : 1);
                      }}
                      aria-invalid={Boolean(errors.quantity)}
                      aria-describedby={describedBy("quantity")}
                      className="h-11 w-20 text-center"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-lg"
                      aria-label="Increase quantity"
                      onClick={() => setQuantity((q) => Math.min(9999, q + 1))}
                    >
                      <Plus />
                    </Button>
                  </div>
                </div>
                <div className="pb-2 text-right">
                  <p className="text-xs text-muted-foreground">Total (cash on delivery)</p>
                  <p className={cn("font-bold", total === null ? "text-sm text-muted-foreground" : "text-xl")} data-testid="order-total">
                    {total === null ? "Price confirmed on WhatsApp" : formatPrice(total, currency)}
                  </p>
                </div>
              </div>
              {fieldError("quantity")}

              <div className="space-y-1.5">
                <Label htmlFor={`${formId}-note`}>
                  Note <span className="font-normal text-muted-foreground">(optional)</span>
                </Label>
                <Textarea
                  id={`${formId}-note`}
                  name="note"
                  rows={2}
                  maxLength={500}
                  placeholder="e.g. best time to call, colour, size"
                  aria-invalid={Boolean(errors.note)}
                  aria-describedby={describedBy("note")}
                />
                {fieldError("note")}
              </div>

              {result && !result.ok && (
                <p className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm font-medium text-destructive" role="alert">
                  {result.error}
                </p>
              )}
            </div>

            <div className="sticky bottom-0 border-t border-border bg-background p-4">
              <Button type="submit" size="lg" className="h-12 w-full text-base font-bold" disabled={pending} data-testid="order-submit">
                {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <CheckCircle2 aria-hidden="true" />}
                {pending ? "Placing order…" : "Place order"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
