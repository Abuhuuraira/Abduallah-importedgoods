"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { supabasePublishableKey, supabaseUrl } from "@/lib/env";

let browserClient: SupabaseClient<Database> | null = null;

/** Browser Supabase client (admin area only — used for direct image uploads). */
export function getSupabaseBrowserClient(): SupabaseClient<Database> {
  if (!browserClient) {
    browserClient = createBrowserClient<Database>(supabaseUrl, supabasePublishableKey);
  }
  return browserClient;
}
