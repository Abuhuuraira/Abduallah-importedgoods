"use client";

import { useState, useTransition } from "react";
import { Eye, EyeOff, Loader2, LogIn, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signInAction, signOutAction } from "@/lib/actions/auth";
import type { ActionResult } from "@/types";

type LoginFormProps = {
  next: string;
  configured: boolean;
  nonAdminEmail: string | null;
  unauthorized: boolean;
};

export function LoginForm({ next, configured, nonAdminEmail, unauthorized }: LoginFormProps) {
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, startTransition] = useTransition();
  const [showPassword, setShowPassword] = useState(false);

  if (nonAdminEmail) {
    return (
      <div className="space-y-4">
        <div className="flex gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive" role="alert">
          <ShieldAlert className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
          <p>
            You are signed in as <strong className="break-all">{nonAdminEmail}</strong>, but this account is not
            authorized to manage the catalog.
          </p>
        </div>
        <form action={signOutAction}>
          <Button type="submit" variant="outline" className="h-11 w-full">
            Sign out and use another account
          </Button>
        </form>
      </div>
    );
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const res = await signInAction(null, formData);
      // On success the action redirects, so we only get here on failure.
      setResult(res);
    });
  }

  const fieldError = (name: string) => (result && !result.ok ? result.fieldErrors?.[name]?.[0] : undefined);
  const error = result && !result.ok ? result.error : unauthorized ? "This account is not authorized to access the admin panel." : null;

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <input type="hidden" name="next" value={next} />

      {!configured && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900" role="alert">
          Supabase is not configured yet. Add your Supabase URL and publishable key to the environment variables
          (see DEPLOYMENT.md).
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive" role="alert" aria-live="assertive">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          inputMode="email"
          required
          aria-invalid={Boolean(fieldError("email"))}
          aria-describedby={fieldError("email") ? "email-error" : undefined}
          placeholder="admin@example.com"
        />
        {fieldError("email") && (
          <p id="email-error" className="text-sm text-destructive">{fieldError("email")}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            aria-invalid={Boolean(fieldError("password"))}
            className="pr-12"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute top-1/2 right-1.5 flex size-9 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
        {fieldError("password") && <p className="text-sm text-destructive">{fieldError("password")}</p>}
      </div>

      <Button type="submit" size="lg" className="w-full" disabled={pending || !configured}>
        {pending ? <Loader2 className="animate-spin" /> : <LogIn />}
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
