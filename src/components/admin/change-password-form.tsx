"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { KeyRound, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { changePasswordAction } from "@/lib/actions/auth";
import type { ActionResult } from "@/types";

export function ChangePasswordForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);
  const fieldError = (name: string) => (result && !result.ok ? result.fieldErrors?.[name]?.[0] : undefined);

  return (
    <form
      ref={formRef}
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        startTransition(async () => {
          const res = await changePasswordAction(null, formData);
          setResult(res);
          if (res.ok) {
            toast.success(res.message);
            formRef.current?.reset();
          } else {
            toast.error(res.error);
          }
        });
      }}
      className="space-y-4 rounded-2xl border border-border/70 bg-card p-4 shadow-soft sm:p-5"
    >
      <div>
        <h2 className="font-semibold">Change your password</h2>
        <p className="text-sm text-muted-foreground">At least 8 characters, with letters and a number.</p>
      </div>
      {result && !result.ok && !result.fieldErrors && (
        <p className="rounded-lg bg-destructive/5 p-3 text-sm text-destructive" role="alert">{result.error}</p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="new-password">New password</Label>
          <Input id="new-password" name="password" type="password" autoComplete="new-password" required aria-invalid={Boolean(fieldError("password"))} />
          {fieldError("password") && <p className="text-sm text-destructive">{fieldError("password")}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm-password">Confirm new password</Label>
          <Input id="confirm-password" name="confirm" type="password" autoComplete="new-password" required aria-invalid={Boolean(fieldError("confirm"))} />
          {fieldError("confirm") && <p className="text-sm text-destructive">{fieldError("confirm")}</p>}
        </div>
      </div>
      <Button type="submit" variant="outline" disabled={pending}>
        {pending ? <Loader2 className="animate-spin" /> : <KeyRound />} Change password
      </Button>
    </form>
  );
}
