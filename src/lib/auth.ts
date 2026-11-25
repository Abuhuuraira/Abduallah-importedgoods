import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { isSupabaseConfigured } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type SessionInfo = {
  user: { id: string; email: string } | null;
  isAdmin: boolean;
  supabase: SupabaseClient<Database> | null;
};

/**
 * Data Access Layer: resolves the signed-in user and whether they are an
 * authorized admin. Verification happens on the server:
 * - getUser() asks Supabase Auth to validate the session token.
 * - Admin status comes from the admin_users table (never from client input,
 *   user metadata or cookies).
 * Memoized per request with React cache().
 */
export const getSession = cache(async (): Promise<SessionInfo> => {
  // Always evaluate per request — admin pages must never be prerendered.
  await connection();
  if (!isSupabaseConfigured) return { user: null, isAdmin: false, supabase: null };

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { user: null, isAdmin: false, supabase };

  const { data, error } = await supabase
    .from("admin_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("[auth] Failed to check admin status:", error.message);
  }

  return {
    user: { id: user.id, email: user.email ?? "" },
    isAdmin: !error && Boolean(data),
    supabase,
  };
});

export type AdminContext = {
  user: { id: string; email: string };
  supabase: SupabaseClient<Database>;
};

/** For admin pages: redirects anyone who is not an authorized admin. */
export async function requireAdmin(): Promise<AdminContext> {
  const session = await getSession();
  if (!session.user || !session.supabase) redirect("/admin/login");
  if (!session.isAdmin) redirect("/admin/login?error=unauthorized");
  return { user: session.user, supabase: session.supabase };
}

/** For Server Actions: returns null instead of redirecting. */
export async function getAdminForAction(): Promise<AdminContext | null> {
  const session = await getSession();
  if (!session.user || !session.supabase || !session.isAdmin) return null;
  return { user: session.user, supabase: session.supabase };
}
