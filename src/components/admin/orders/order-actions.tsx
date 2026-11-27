"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { CheckCircle2, Loader2, Lock, PackageCheck, RotateCcw, Save, Trash2, Truck, XCircle } from "lucide-react";
import { WhatsAppIcon } from "@/components/icons/whatsapp-icon";
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
import { Textarea } from "@/components/ui/textarea";
import { deleteOrderAction, saveOrderNoteAction, setOrderStatusAction } from "@/lib/actions/orders";
import { setProductStatusAction } from "@/lib/actions/products";
import { formatOrderNumber, ORDER_NEXT_STEPS, type OrderStatus } from "@/lib/orders";
import type { ActionResult } from "@/types";

const STEP_ICONS: Record<OrderStatus, typeof CheckCircle2> = {
  new: RotateCcw,
  confirmed: CheckCircle2,
  shipped: Truck,
  delivered: PackageCheck,
  cancelled: XCircle,
};

type Props = {
  orderId: string;
  orderNumber: number;
  status: OrderStatus;
  customerWhatsappUrl: string;
  product: { id: string; status: "available" | "booked"; code: string } | null;
};

export function OrderActions({ orderId, orderNumber, status, customerWhatsappUrl, product }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const label = formatOrderNumber(orderNumber);

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

  const steps = ORDER_NEXT_STEPS[status];
  const setStatus = (to: OrderStatus) => run(() => setOrderStatusAction(orderId, status, to, orderNumber));

  return (
    <div className="space-y-3">
      <a
        href={customerWhatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-whatsapp px-4 font-bold text-white shadow-soft hover:bg-whatsapp-hover"
        data-testid="message-customer"
      >
        <WhatsAppIcon className="size-5" /> Message customer on WhatsApp
      </a>

      {steps.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-2">
          {steps.map((step, i) => {
            const Icon = STEP_ICONS[step.to];
            const cancel = step.to === "cancelled";
            return (
              <Button
                key={step.to}
                type="button"
                size="lg"
                variant={cancel ? "outline" : i === 0 ? "default" : "outline"}
                className={cancel ? "h-12 border-destructive/40 text-destructive hover:bg-destructive/5" : "h-12"}
                disabled={pending}
                onClick={() => (cancel ? setConfirmCancel(true) : setStatus(step.to))}
                data-testid={`order-step-${step.to}`}
              >
                {pending ? <Loader2 className="animate-spin" /> : <Icon />}
                {step.label}
              </Button>
            );
          })}
        </div>
      )}

      {product && product.status === "available" && status !== "cancelled" && (
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="h-12 w-full"
          disabled={pending}
          onClick={() => run(() => setProductStatusAction(product.id, "booked"))}
          data-testid="mark-product-booked"
        >
          <Lock /> Mark {product.code} as Booked on the website
        </Button>
      )}

      {(status === "cancelled" || status === "delivered") && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-full text-destructive hover:bg-destructive/5 hover:text-destructive"
          disabled={pending}
          onClick={() => setConfirmDelete(true)}
        >
          <Trash2 /> Delete this order
        </Button>
      )}

      <AlertDialog open={confirmCancel} onOpenChange={setConfirmCancel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel {label}?</AlertDialogTitle>
            <AlertDialogDescription>
              The order stays in your list as Cancelled. You can reopen it later. Remember to tell the customer on WhatsApp.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep order</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => setStatus("cancelled")}
            >
              Cancel order
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {label} permanently?</AlertDialogTitle>
            <AlertDialogDescription>This removes the order and the customer&apos;s details. It cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => run(() => deleteOrderAction(orderId), () => router.replace("/admin/orders"))}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export function OrderNoteForm({ orderId, initialNote }: { orderId: string; initialNote: string }) {
  const [note, setNote] = useState(initialNote);
  const [savedNote, setSavedNote] = useState(initialNote);
  const [pending, startTransition] = useTransition();
  const dirty = note.trim() !== savedNote.trim();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const result = await saveOrderNoteAction(orderId, note);
          if (result.ok) {
            setSavedNote(note);
            toast.success(result.message ?? "Saved");
          } else toast.error(result.error);
        });
      }}
      className="space-y-2"
    >
      <Textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={3}
        maxLength={1000}
        placeholder="Private note — only admins see this (e.g. courier, tracking number, delivery time)"
        aria-label="Private admin note"
      />
      <Button type="submit" variant="outline" disabled={!dirty || pending}>
        {pending ? <Loader2 className="animate-spin" /> : <Save />} Save note
      </Button>
    </form>
  );
}
