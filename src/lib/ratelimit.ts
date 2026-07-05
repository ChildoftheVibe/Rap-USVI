import type { SupabaseClient } from "@supabase/supabase-js";

const WINDOW_MINUTES = 10;
const MAX_SUBMISSIONS_PER_WINDOW = 5;

/** Simple sliding-window rate limit backed by the inquiries table itself — no extra infra. */
export async function isRateLimited(
  supabase: SupabaseClient,
  ipHash: string
): Promise<boolean> {
  const windowStart = new Date(Date.now() - WINDOW_MINUTES * 60_000).toISOString();

  const { count, error } = await supabase
    .from("inquiries")
    .select("id", { count: "exact", head: true })
    .eq("ip_hash", ipHash)
    .gte("created_at", windowStart);

  if (error) {
    // Fail open on infra errors — a broken rate-limit check shouldn't block
    // legitimate submissions; Turnstile + honeypot are the primary defenses.
    return false;
  }

  return (count ?? 0) >= MAX_SUBMISSIONS_PER_WINDOW;
}
