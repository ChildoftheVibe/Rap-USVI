import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/adminAllowlist";

export { isAdminEmail };

/**
 * Gate for Server Components and Server Actions under /admin. Authentication
 * alone is not enough — see src/lib/adminAllowlist.ts for why. Redirects
 * rather than throwing so an expired session lands on the login page instead
 * of an error boundary.
 */
export async function requireAdminUser(): Promise<User> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAdminEmail(user.email)) {
    redirect("/admin/login?error=forbidden");
  }

  return user;
}

/**
 * Gate for admin Route Handlers, which should answer with a status code
 * instead of a redirect. Returns the user on success, or null when the caller
 * should respond 401.
 */
export async function getAdminUserOrNull(): Promise<User | null> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user && isAdminEmail(user.email) ? user : null;
}
