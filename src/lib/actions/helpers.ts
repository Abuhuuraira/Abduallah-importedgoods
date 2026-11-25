import "server-only";

import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { ActionResult } from "@/types";
import { STORAGE_BUCKET } from "@/lib/constants";

type Client = SupabaseClient<Database>;

export const UNAUTHORIZED: ActionResult<never> = {
  ok: false,
  code: "UNAUTHORIZED",
  error: "Your session has expired or you are not authorized. Please sign in again.",
};

export function publicImageUrl(supabase: Client, path: string): string {
  return supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path).data.publicUrl;
}

/** Checks that an uploaded file really exists in our bucket before saving its path. */
export async function imageExists(supabase: Client, path: string): Promise<boolean> {
  const { data, error } = await supabase.storage.from(STORAGE_BUCKET).exists(path);
  if (error) return false;
  return data === true;
}

/** Best-effort removal of an image that is no longer referenced. */
export async function removeImage(supabase: Client, path: string | null | undefined) {
  if (!path) return;
  const { error } = await supabase.storage.from(STORAGE_BUCKET).remove([path]);
  if (error) console.error(`[storage] Could not delete ${path}:`, error.message);
}

export function isUniqueViolation(error: PostgrestError | null, constraint?: string): boolean {
  if (!error || error.code !== "23505") return false;
  if (!constraint) return true;
  return `${error.message} ${error.details ?? ""}`.includes(constraint);
}

export function isForeignKeyViolation(error: PostgrestError | null): boolean {
  return error?.code === "23503";
}

export function isPermissionError(error: PostgrestError | null): boolean {
  return error?.code === "42501";
}

/** Generic, non-leaky message for unexpected database errors. */
export function dbErrorMessage(error: PostgrestError, action: string): string {
  console.error(`[db] ${action} failed:`, error.code, error.message, error.details);
  if (isPermissionError(error)) return "You do not have permission to do this.";
  return `Could not ${action}. Please try again.`;
}

/** Existing slugs equal to `base` or `base-N` in a table (base is [a-z0-9-] only). */
export async function takenProductSlugs(supabase: Client, base: string, excludeId?: string) {
  const { data } = await supabase
    .from("products")
    .select("id, slug")
    .or(`slug.eq.${base},slug.like.${base}-*`);
  return (data ?? []).filter((r) => r.id !== excludeId).map((r) => r.slug);
}

export async function takenCategorySlugs(supabase: Client, base: string, excludeId?: string) {
  const { data } = await supabase
    .from("categories")
    .select("id, slug")
    .or(`slug.eq.${base},slug.like.${base}-*`);
  return (data ?? []).filter((r) => r.id !== excludeId).map((r) => r.slug);
}
