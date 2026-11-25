"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { ExternalLink, Layers, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createCategoryAction, deleteCategoryAction, updateCategoryAction } from "@/lib/actions/categories";
import type { ActionResult, CategoryWithCount } from "@/types";

export function CategoryManager({ categories }: { categories: CategoryWithCount[] }) {
  const [editing, setEditing] = useState<CategoryWithCount | null>(null);
  const [deleting, setDeleting] = useState<CategoryWithCount | null>(null);

  return (
    <div className="space-y-6">
      <AddCategoryForm />

      {categories.length === 0 ? (
        <EmptyState icon={Layers} title="No categories yet" description="Add categories such as Electronics or Kitchen Items so customers can filter products." />
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border/70 bg-card shadow-soft" role="list">
          {categories.map((c) => (
            <li key={c.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="truncate font-semibold">{c.name}</p>
                <p className="text-xs text-muted-foreground">
                  /{c.slug} ·{" "}
                  <Link href={`/admin/products?category=${c.slug}`} className="font-medium text-primary hover:underline">
                    {c.product_count} product{c.product_count === 1 ? "" : "s"}
                  </Link>
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button asChild variant="ghost" size="sm" className="text-muted-foreground">
                  <a href={`/products?category=${c.slug}`} target="_blank" rel="noopener noreferrer" aria-label={`View ${c.name} on website`}>
                    <ExternalLink />
                  </a>
                </Button>
                <Button variant="outline" size="sm" onClick={() => setEditing(c)}>
                  <Pencil /> Rename
                </Button>
                <Button variant="outline" size="sm" onClick={() => setDeleting(c)} className="text-destructive hover:text-destructive">
                  <Trash2 /> Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <EditCategoryDialog category={editing} onClose={() => setEditing(null)} />
      <DeleteCategoryDialog category={deleting} categories={categories} onClose={() => setDeleting(null)} />
    </div>
  );
}

function AddCategoryForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      ref={formRef}
      className="rounded-2xl border border-border/70 bg-card p-4 shadow-soft sm:p-5"
      onSubmit={(e) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        startTransition(async () => {
          const res = await createCategoryAction(null, formData);
          if (res.ok) {
            toast.success(res.message);
            setError(null);
            formRef.current?.reset();
          } else {
            setError(res.fieldErrors?.name?.[0] ?? res.error);
            toast.error(res.error);
          }
        });
      }}
    >
      <Label htmlFor="new-category" className="mb-2">Add a category</Label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          id="new-category"
          name="name"
          placeholder="e.g. Mobile Accessories"
          maxLength={80}
          required
          aria-invalid={Boolean(error)}
          className="flex-1"
        />
        <Button type="submit" disabled={pending} className="h-11">
          {pending ? <Loader2 className="animate-spin" /> : <Plus />} Add category
        </Button>
      </div>
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
    </form>
  );
}

function EditCategoryDialog({ category, onClose }: { category: CategoryWithCount | null; onClose: () => void }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <Dialog
      open={Boolean(category)}
      onOpenChange={(open) => {
        if (!open) {
          setError(null);
          onClose();
        }
      }}
    >
      <DialogContent>
        {category && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              startTransition(async () => {
                const res: ActionResult = await updateCategoryAction(null, formData);
                if (res.ok) {
                  toast.success(res.message);
                  setError(null);
                  onClose();
                } else {
                  setError(res.fieldErrors?.name?.[0] ?? res.error);
                }
              });
            }}
            className="space-y-4"
          >
            <DialogHeader>
              <DialogTitle>Rename category</DialogTitle>
              <DialogDescription>Products in this category keep their category — only the name and link change.</DialogDescription>
            </DialogHeader>
            <input type="hidden" name="id" value={category.id} />
            <div className="space-y-2">
              <Label htmlFor="edit-category-name">Category name</Label>
              <Input id="edit-category-name" name="name" defaultValue={category.name} maxLength={80} required autoFocus aria-invalid={Boolean(error)} />
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={pending}>
                {pending && <Loader2 className="animate-spin" />} Save
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function DeleteCategoryDialog({
  category,
  categories,
  onClose,
}: {
  category: CategoryWithCount | null;
  categories: CategoryWithCount[];
  onClose: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [target, setTarget] = useState<string>("none");
  const [error, setError] = useState<string | null>(null);

  const hasProducts = (category?.product_count ?? 0) > 0;
  const others = categories.filter((c) => c.id !== category?.id);

  function close() {
    setTarget("none");
    setError(null);
    onClose();
  }

  function confirm() {
    if (!category) return;
    startTransition(async () => {
      const res = await deleteCategoryAction({
        id: category.id,
        moveProducts: hasProducts,
        targetCategoryId: target === "none" ? null : target,
      });
      if (res.ok) {
        toast.success(res.message);
        close();
      } else {
        setError(res.error);
        toast.error(res.error);
      }
    });
  }

  return (
    <Dialog open={Boolean(category)} onOpenChange={(open) => !open && close()}>
      <DialogContent>
        {category && (
          <div className="space-y-4">
            <DialogHeader>
              <DialogTitle>Delete “{category.name}”?</DialogTitle>
              <DialogDescription>
                {hasProducts
                  ? `${category.product_count} product${category.product_count === 1 ? " uses" : "s use"} this category. Choose where to move ${category.product_count === 1 ? "it" : "them"} before deleting. No products will be deleted.`
                  : "This category has no products. It will be removed permanently."}
              </DialogDescription>
            </DialogHeader>

            {hasProducts && (
              <div className="space-y-2">
                <Label htmlFor="move-target">Move products to</Label>
                <Select value={target} onValueChange={setTarget}>
                  <SelectTrigger id="move-target" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent position="popper">
                    <SelectItem value="none">No category (Uncategorized)</SelectItem>
                    {others.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {error && <p className="rounded-lg bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={close}>Cancel</Button>
              <Button type="button" onClick={confirm} disabled={pending} className="bg-destructive text-white hover:bg-destructive/90">
                {pending ? <Loader2 className="animate-spin" /> : <Trash2 />}
                {hasProducts ? "Move products & delete" : "Delete category"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
