import { createBrowserClient } from "@supabase/ssr";

/** Browser client for the admin login form. Uses the public anon/publishable key only. */
export function createBrowserSupabaseClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
