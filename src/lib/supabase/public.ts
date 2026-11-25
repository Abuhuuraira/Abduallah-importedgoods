import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { isSupabaseConfigured, supabasePublishableKey, supabaseUrl } from "@/lib/env";

/**
 * Cookie-less Supabase client for PUBLIC catalog reads.
 *
 * It always acts as an anonymous visitor, so Row Level Security only lets it
 * read published products, categories and public settings. Because it never
 * touches cookies, results can be cached and pages can be prerendered.
 */
let client: SupabaseClient<Database> | null = null;

export function getPublicSupabase(): SupabaseClient<Database> | null {
  if (!isSupabaseConfigured) return null;
  if (!client) {
    client = createClient<Database>(supabaseUrl, supabasePublishableKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  }
  return client;
}
