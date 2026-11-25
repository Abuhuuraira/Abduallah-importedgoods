"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { CheckCircle2, ExternalLink, Hash, Loader2, Lock, RefreshCw, Save, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { createProductAction, discardUploadedImageAction, updateProductAction } from "@/lib/actions/products";
import { currencyLabel, formatDateTime } from "@/lib/format";
import { productPath } from "@/lib/site";
import { cn } from "@/lib/utils";
import type { ActionResult, AdminProduct, Category, ProductStatus } from "@/types";
import { ImageUploader } from "./image-uploader";

type SavedProduct = { id: string; product_code: string; slug: string; version: number };

type ProductFormProps = {
  product?: AdminProduct;
  categories: Category[];
  currency: string;
};

export function ProductForm({ product, categories, currency }: ProductFormProps) {
  const isEdit = Boolean(product);
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ActionResult<SavedProduct> | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pendingUpload, setPendingUpload] = useState<string | null>(null);

  const [categoryId, setCategoryId] = useState<string>(product?.category_id ?? "none");
  const [status, setStatus] = useState<ProductStatus>(product?.status ?? "available");
  const [published, setPublished] = useState<boolean>(product?.is_published ?? true);
  const [newArrival, setNewArrival] = useState<boolean>(product?.is_new_arrival ?? !isEdit);
  const [description, setDescription] = useState(product?.description ?? "");

  const onBusyChange = useCallback((busy: boolean) => setUploading(busy), []);
  const onPendingUploadChange = useCallback((path: string | null) => setPendingUpload(path), []);

  const fieldError = (name: string) => (result && !result.ok ? result.fieldErrors?.[name]?.[0] : undefined);
  const conflict = result && !result.ok && (result.code === "CONFLICT" || result.code === "NOT_FOUND");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (uploading) {
      toast.info("Please wait for the image upload to finish.");
      return;
    }
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const action = isEdit ? updateProductAction : createProductAction;
      const res = await action(null, formData);
      setResult(res);
      if (res.ok) {
        setPendingUpload(null);
        toast.success(res.message ?? "Product saved.");
        router.push("/admin/products");
      } else {
        toast.error(res.error);
        if (res.fieldErrors) {
          const first = Object.keys(res.fieldErrors)[0];
          formRef.current?.querySelector<HTMLElement>(`[name="${first}"], #field-${first}`)?.focus();
        }
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
  }

  function handleCancel() {
    if (pendingUpload) void discardUploadedImageAction(pendingUpload);
    router.push("/admin/products");
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate className="pb-24 lg:pb-0">
      {product && (
        <>
          <input type="hidden" name="id" value={product.id} />
          <input type="hidden" name="version" value={product.version} />
        </>
      )}
      <input type="hidden" name="category_id" value={categoryId === "none" ? "" : categoryId} />
      <input type="hidden" name="status" value={status} />
      <input type="hidden" name="is_published" value={published ? "on" : ""} />
      <input type="hidden" name="is_new_arrival" value={newArrival ? "on" : ""} />

      {result && !result.ok && (
        <div
          className={cn(
            "mb-5 flex flex-col gap-3 rounded-xl border p-4 text-sm sm:flex-row sm:items-center sm:justify-between",
            conflict ? "border-amber-300 bg-amber-50 text-amber-900" : "border-destructive/30 bg-destructive/5 text-destructive",
          )}
          role="alert"
        >
          <p className="flex gap-2">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {result.error}
          </p>
          {conflict && (
            <Button type="button" variant="outline" size="sm" onClick={() => router.refresh()} className="shrink-0">
              <RefreshCw /> Reload latest version
            </Button>
          )}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] lg:gap-6">
        {/* Left column: image + publishing */}
        <div className="space-y-5">
          <section className="rounded-2xl border border-border/70 bg-card p-4 shadow-soft sm:p-5">
            <ImageUploader
              name="image_path"
              folder="products"
              label="Product image"
              required
              initialPath={product?.image_path}
              initialUrl={product?.image_url}
              error={fieldError("image_path")}
              onBusyChange={onBusyChange}
              onPendingUploadChange={onPendingUploadChange}
            />
          </section>

          <section className="space-y-4 rounded-2xl border border-border/70 bg-card p-4 shadow-soft sm:p-5">
            <h2 className="font-semibold">Visibility &amp; availability</h2>

            <div className="space-y-2">
              <span className="text-sm font-medium" id="status-label">Availability status</span>
              <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-labelledby="status-label">
                {(["available", "booked"] as const).map((value) => {
                  const active = status === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => setStatus(value)}
                      className={cn(
                        "flex h-12 items-center justify-center gap-2 rounded-xl border-2 text-sm font-semibold transition-colors",
                        active && value === "available" && "border-success bg-success-soft text-success",
                        active && value === "booked" && "border-booked bg-booked-soft text-booked",
                        !active && "border-border text-muted-foreground hover:bg-muted",
                      )}
                    >
                      {value === "available" ? <CheckCircle2 className="size-4" /> : <Lock className="size-4" />}
                      {value === "available" ? "Available" : "Booked"}
                    </button>
                  );
                })}
              </div>
            </div>

            <ToggleRow
              id="field-is_published"
              title={published ? "Published" : "Draft"}
              description={published ? "Visible to customers on the website." : "Hidden from customers. Only admins can see it."}
              checked={published}
              onCheckedChange={setPublished}
            />
            <ToggleRow
              id="field-is_new_arrival"
              title="New Arrival"
              description="Show a “New Arrival” badge and include it in the New Arrivals section."
              checked={newArrival}
              onCheckedChange={setNewArrival}
            />
          </section>
        </div>

        {/* Right column: details */}
        <section className="space-y-5 rounded-2xl border border-border/70 bg-card p-4 shadow-soft sm:p-5">
          <h2 className="font-semibold">Product details</h2>

          <div className="space-y-2">
            <Label>Product ID</Label>
            <div className="flex h-11 items-center gap-2 rounded-lg border border-dashed border-border bg-muted/40 px-3 text-sm">
              <Hash className="size-4 text-muted-foreground" aria-hidden="true" />
              {product ? (
                <span className="font-mono font-semibold">{product.product_code}</span>
              ) : (
                <span className="text-muted-foreground">Generated automatically when you save (e.g. AIG-001)</span>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">
              Product name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              name="name"
              defaultValue={product?.name}
              required
              maxLength={150}
              placeholder="e.g. Imported Wireless Headphones"
              aria-invalid={Boolean(fieldError("name"))}
            />
            {fieldError("name") && <p className="text-sm text-destructive">{fieldError("name")}</p>}
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="price">Price ({currency})</Label>
              <div className="relative">
                <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm font-medium text-muted-foreground">
                  {currencyLabel(currency)}
                </span>
                <Input
                  id="price"
                  name="price"
                  inputMode="decimal"
                  defaultValue={product?.price ?? ""}
                  placeholder="2500"
                  className="pl-12"
                  aria-invalid={Boolean(fieldError("price"))}
                  aria-describedby="price-help"
                />
              </div>
              {fieldError("price") ? (
                <p className="text-sm text-destructive">{fieldError("price")}</p>
              ) : (
                <p id="price-help" className="text-xs text-muted-foreground">Leave empty to show “Price on request”.</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="field-category_id">Category</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger id="field-category_id" className="w-full" aria-invalid={Boolean(fieldError("category_id"))}>
                  <SelectValue placeholder="Choose a category" />
                </SelectTrigger>
                <SelectContent position="popper">
                  <SelectItem value="none">No category</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldError("category_id") ? (
                <p className="text-sm text-destructive">{fieldError("category_id")}</p>
              ) : categories.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No categories yet. <Link href="/admin/categories" className="underline">Add categories</Link>
                </p>
              ) : null}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="description">Description</Label>
              <span className="text-xs text-muted-foreground">{description.length}/5000</span>
            </div>
            <Textarea
              id="description"
              name="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={5000}
              rows={8}
              placeholder={"Features, size, colour, material, warranty, carton quantity…"}
              aria-invalid={Boolean(fieldError("description"))}
              className="min-h-40"
            />
            {fieldError("description") && <p className="text-sm text-destructive">{fieldError("description")}</p>}
          </div>

          {product && (
            <div className="flex flex-col gap-1 rounded-xl bg-muted/50 p-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
              <span>Created {formatDateTime(product.created_at)} · Updated {formatDateTime(product.updated_at)}</span>
              {product.is_published && (
                <a href={productPath(product.slug)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
                  View on website <ExternalLink className="size-3" />
                </a>
              )}
            </div>
          )}

          {/* Desktop actions */}
          <div className="hidden justify-end gap-2 border-t border-border pt-5 lg:flex">
            <Button type="button" variant="outline" size="lg" onClick={handleCancel} disabled={pending}>
              Cancel
            </Button>
            <SubmitButton pending={pending} uploading={uploading} isEdit={isEdit} published={published} />
          </div>
        </section>
      </div>

      {/* Mobile sticky actions */}
      <div className="pb-safe fixed inset-x-0 bottom-0 z-30 flex gap-2 border-t border-border bg-background/95 px-4 pt-3 backdrop-blur lg:hidden">
        <Button type="button" variant="outline" size="lg" onClick={handleCancel} disabled={pending} className="flex-1">
          Cancel
        </Button>
        <SubmitButton pending={pending} uploading={uploading} isEdit={isEdit} published={published} className="flex-[2]" />
      </div>
    </form>
  );
}

function SubmitButton({
  pending,
  uploading,
  isEdit,
  published,
  className,
}: {
  pending: boolean;
  uploading: boolean;
  isEdit: boolean;
  published: boolean;
  className?: string;
}) {
  const label = isEdit ? "Save changes" : published ? "Publish product" : "Save as draft";
  return (
    <Button type="submit" size="lg" disabled={pending || uploading} className={className}>
      {pending || uploading ? <Loader2 className="animate-spin" /> : <Save />}
      {pending ? "Saving…" : uploading ? "Uploading image…" : label}
    </Button>
  );
}

function ToggleRow({
  id,
  title,
  description,
  checked,
  onCheckedChange,
}: {
  id: string;
  title: string;
  description: string;
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
}) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-border p-3.5 hover:bg-muted/40">
      <span className="min-w-0">
        <span className="block text-sm font-semibold">{title}</span>
        <span className="block text-xs text-muted-foreground">{description}</span>
      </span>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} className="scale-125" />
    </label>
  );
}
