import type { Metadata } from "next";
import { verifyUnsubscribeToken } from "@/lib/unsubscribe";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { site, contact } from "@/lib/content";

export const metadata: Metadata = {
  title: `Unsubscribe | ${site.name}`,
  robots: { index: false, follow: false },
};

type Outcome = "unsubscribed" | "invalid" | "error";

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; token?: string }>;
}) {
  const { email, token } = await searchParams;
  const tokenValid = !!email && !!token && verifyUnsubscribeToken(email, token);

  let outcome: Outcome = tokenValid ? "unsubscribed" : "invalid";

  if (tokenValid) {
    try {
      const supabase = createServiceRoleClient();
      const { error } = await supabase
        .from("email_unsubscribes")
        .upsert({ email: email.trim().toLowerCase() }, { onConflict: "email", ignoreDuplicates: true });
      if (error) outcome = "error";
    } catch {
      // Supabase misconfigured/unreachable — don't let a real recipient see a raw 500.
      outcome = "error";
    }
  }

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-margin-mobile py-16 text-center">
      {outcome === "unsubscribed" && (
        <>
          <h1 className="mb-2 font-[family-name:var(--font-headline)] text-2xl text-primary">
            You&apos;ve been unsubscribed
          </h1>
          <p className="text-on-surface-variant">
            {email} won&apos;t receive further email updates from {site.name}. If this was a mistake, contact us and
            we&apos;ll add you back.
          </p>
        </>
      )}

      {outcome === "invalid" && (
        <>
          <h1 className="mb-2 font-[family-name:var(--font-headline)] text-2xl text-error">
            Unsubscribe link invalid
          </h1>
          <p className="text-on-surface-variant">
            This link is missing or no longer valid. If you&apos;d like to stop receiving emails, contact us directly.
          </p>
        </>
      )}

      {outcome === "error" && (
        <>
          <h1 className="mb-2 font-[family-name:var(--font-headline)] text-2xl text-error">Something went wrong</h1>
          <p className="text-on-surface-variant">
            We couldn&apos;t process your request right now. Please email{" "}
            <a href={`mailto:${contact.emails[0]}`} className="text-primary underline">
              {contact.emails[0]}
            </a>{" "}
            and we&apos;ll remove you manually.
          </p>
        </>
      )}
    </div>
  );
}
