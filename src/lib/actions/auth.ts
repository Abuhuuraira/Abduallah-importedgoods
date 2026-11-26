"use server";

import { redirect } from "next/navigation";
import { getAdminForAction } from "@/lib/auth";
import { isSupabaseConfigured, SUPABASE_NOT_CONFIGURED_MESSAGE } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fieldErrorsOf, loginSchema, passwordChangeSchema } from "@/lib/validation";
import type { ActionResult } from "@/types";

function safeNextPath(value: FormDataEntryValue | null): string {
  const next = typeof value === "string" ? value : "";
  // Only allow internal admin paths (prevents open redirects)
  if (/^\/admin(\/[A-Za-z0-9\-_/]*)?$/.test(next) && next !== "/admin/login") return next;
  return "/admin";
}

export async function signInAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  if (!isSupabaseConfigured) {
    return { ok: false, error: SUPABASE_NOT_CONFIGURED_MESSAGE };
  }

  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { ok: false, error: "Please check the highlighted fields.", fieldErrors: fieldErrorsOf(parsed.error) };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error || !data.user) {
    if (error) console.error("[auth] Sign-in failed:", error.code ?? error.status, error.message);
    const code = error?.code ?? "";
    const message = error?.message ?? "";

    if (error?.status === 429 || code.startsWith("over_") || /rate limit/i.test(message)) {
      return { ok: false, error: "Too many sign-in attempts. Please wait a few minutes and try again." };
    }
    if (code === "email_not_confirmed" || /not confirmed/i.test(message)) {
      return {
        ok: false,
        code: "EMAIL_NOT_CONFIRMED",
        error:
          "This account's email is not confirmed yet. In Supabase → Authentication → Users, delete the user and create it again with “Auto Confirm User” ticked (or confirm it with the SQL in DEPLOYMENT.md, Troubleshooting).",
      };
    }
    if (code === "user_banned") {
      return { ok: false, error: "This account has been disabled in Supabase." };
    }
    if (code === "invalid_credentials" || error?.status === 400) {
      return { ok: false, error: "Incorrect email or password." };
    }
    return {
      ok: false,
      error: "Could not reach the login service. Check your internet connection and the Supabase settings, then try again.",
    };
  }

  // Authentication succeeded — now check AUTHORIZATION on the server.
  const { data: adminRow, error: adminError } = await supabase
    .from("admin_users")
    .select("user_id")
    .eq("user_id", data.user.id)
    .maybeSingle();

  if (adminError || !adminRow) {
    if (adminError) console.error("[auth] Admin check failed:", adminError.code, adminError.message);
    await supabase.auth.signOut();
    return {
      ok: false,
      code: "NOT_ADMIN",
      error: adminError
        ? "Signed in, but the admin check failed. Make sure all 4 SQL migration files were run in Supabase."
        : "The password is correct, but this account is not an admin yet. Run supabase/create-admin.sql in the Supabase SQL Editor with this exact email.",
    };
  }

  redirect(safeNextPath(formData.get("next")));
}

/** Lets a signed-in admin change their own password. */
export async function changePasswordAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const admin = await getAdminForAction();
  if (!admin) {
    return { ok: false, code: "UNAUTHORIZED", error: "Your session has expired. Please sign in again." };
  }

  const parsed = passwordChangeSchema.safeParse({
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) {
    return { ok: false, error: "Please check the highlighted fields.", fieldErrors: fieldErrorsOf(parsed.error) };
  }

  const { error } = await admin.supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("different")) {
      return { ok: false, error: "The new password must be different from your current password." };
    }
    if (msg.includes("reauthentication") || msg.includes("recent")) {
      return { ok: false, error: "For security, please sign out, sign in again, and then change your password." };
    }
    if (msg.includes("weak") || msg.includes("password")) {
      return { ok: false, error: `Password not accepted: ${error.message}` };
    }
    console.error("[auth] Password change failed:", error.message);
    return { ok: false, error: "Could not change the password. Please try again." };
  }

  return { ok: true, message: "Password changed. Use the new password next time you sign in." };
}

export async function signOutAction(): Promise<void> {
  if (isSupabaseConfigured) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  }
  redirect("/admin/login");
}
