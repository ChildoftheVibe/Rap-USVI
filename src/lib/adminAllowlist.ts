/**
 * The admin allowlist, kept dependency-free so it can be imported from the
 * middleware (Edge runtime) as well as from Server Components and Actions.
 *
 * Having a valid Supabase session is NOT sufficient to be an admin. Supabase
 * projects accept self-service sign-ups by default, and both the project URL
 * and the anon key ship in the client bundle — so "is someone signed in?" is a
 * question anyone on the internet can make return true. Membership here is the
 * actual authorization check.
 *
 * This fails closed on purpose: an unset or empty ADMIN_EMAILS locks everyone
 * out rather than letting everyone in.
 */
function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const allowlist = adminEmails();
  if (allowlist.length === 0) {
    console.error("ADMIN_EMAILS is not configured — denying all admin access.");
    return false;
  }
  return allowlist.includes(email.toLowerCase());
}
