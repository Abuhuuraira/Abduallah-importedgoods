"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  CheckCircle2,
  ExternalLink,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  deleteProductAction,
  setProductPublishedAction,
  setProductStatusAction,
} from "@/lib/actions/products";
import { productPath } from "@/lib/site";
import { cn } from "@/lib/utils";
import type { ActionResult, AdminProduct } from "@/types";

type Props = {
  product: Pick<AdminProduct, "id" | "name" | "product_code" | "slug" | "status" | "is_published">;
  /** Show the big Book/Available toggle next to the menu. */
  showStatusButton?: boolean;
  /** Where to go after a successful delete (e.g. from the edit page). */
  afterDeleteHref?: string;
};

export function ProductRowActions({ product, showStatusButton = true, afterDeleteHref }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmBook, setConfirmBook] = useState(false);
  const booked = product.status === "booked";

  function run(action: () => Promise<ActionResult>, onSuccess?: () => void) {
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        toast.success(result.message ?? "Done");
        onSuccess?.();
      } else if (result.code === "CONFLICT") toast.warning(result.error);
      else toast.error(result.error);
    });
  }

  const toggleStatus = () =>
    run(() => setProductStatusAction(product.id, booked ? "available" : "booked"));

  return (
    <div className="flex items-center justify-end gap-2">
      {showStatusButton && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => (booked ? toggleStatus() : setConfirmBook(true))}
          className={cn(
            "h-9 whitespace-nowrap",
            booked
              ? "border-success/40 text-success hover:bg-success-soft hover:text-success"
              : "border-booked/40 text-booked hover:bg-booked-soft hover:text-booked",
          )}
        >
          {pending ? <Loader2 className="animate-spin" /> : booked ? <CheckCircle2 /> : <Lock />}
          {booked ? "Mark Available" : "Mark Booked"}
        </Button>
      )}

      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="ghost" size="icon-sm" aria-label={`Actions for ${product.name}`} disabled={pending}>
            {pending && !showStatusButton ? <Loader2 className="animate-spin" /> : <MoreHorizontal />}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuLabel className="truncate">{product.product_code}</DropdownMenuLabel>
          <DropdownMenuItem asChild>
            <Link href={`/admin/products/${product.id}/edit`}>
              <Pencil /> Edit product
            </Link>
          </DropdownMenuItem>
          {product.is_published && (
            <DropdownMenuItem asChild>
              <a href={productPath(product.slug)} target="_blank" rel="noopener noreferrer">
                <ExternalLink /> View on website
              </a>
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => (booked ? toggleStatus() : setConfirmBook(true))}>
            {booked ? <CheckCircle2 /> : <Lock />}
            {booked ? "Mark as Available" : "Mark as Booked"}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => run(() => setProductPublishedAction(product.id, !product.is_published))}>
            {product.is_published ? <EyeOff /> : <Eye />}
            {product.is_published ? "Unpublish (hide)" : "Publish (show)"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => setConfirmDelete(true)}>
            <Trash2 /> Delete product
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Confirm booking */}
      <AlertDialog open={confirmBook} onOpenChange={setConfirmBook}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark {product.product_code} as BOOKED?</AlertDialogTitle>
            <AlertDialogDescription>
              “{product.name}” will show a BOOKED badge on the website and customers will no longer be able to
              book it. You can mark it available again at any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-booked text-white hover:bg-booked/90"
              onClick={() => {
                setConfirmBook(false);
                toggleStatus();
              }}
            >
              <Lock /> Mark as Booked
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm delete */}
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {product.product_code}?</AlertDialogTitle>
            <AlertDialogDescription>
              “{product.name}” and its image will be permanently deleted. This cannot be undone. To hide it
              temporarily, unpublish it instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => {
                setConfirmDelete(false);
                run(
                  () => deleteProductAction(product.id),
                  afterDeleteHref ? () => router.push(afterDeleteHref) : undefined,
                );
              }}
            >
              <Trash2 /> Delete permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
