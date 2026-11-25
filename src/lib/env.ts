/**
 * Public configuration. These values are safe to expose to the browser:
 * the publishable key only grants what Row Level Security allows.
 *
 * NEVER put the Supabase secret / service_role key in a NEXT_PUBLIC_ variable.
 * This app does not need the secret key at all.
 */
export const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim().replace(/\/+$/, "");

export const supabasePublishableKey = (
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  // Older Supabase projects call this the "anon" key — accepted as a fallback.
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  ""
).trim();

export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey);

export const SUPABASE_NOT_CONFIGURED_MESSAGE =
  "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY to your environment variables.";
