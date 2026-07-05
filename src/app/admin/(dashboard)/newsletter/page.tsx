import type { Metadata } from "next";
import { createServiceRoleClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Newsletter Sign-ups | Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2";

export default async function AdminNewsletterPage() {
  const supabase = createServiceRoleClient();
  const { data: signups, error } = await supabase
    .from("newsletter_signups")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-[family-name:var(--font-headline)] text-2xl text-on-surface">Newsletter Sign-ups</h1>
        <a
          href="/api/admin/export/newsletter"
          className={`rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 ${FOCUS_RING}`}
        >
          Download CSV
        </a>
      </div>

      {error && (
        <p role="alert" className="text-error">
          Failed to load sign-ups.
        </p>
      )}

      {!error && (!signups || signups.length === 0) && (
        <p className="text-on-surface-variant">No sign-ups yet.</p>
      )}

      {!error && signups && signups.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-outline-variant bg-surface-container-lowest">
          <table className="w-full min-w-[480px] text-left text-sm">
            <caption className="sr-only">Newsletter sign-ups, most recent first</caption>
            <thead className="border-b border-outline-variant text-xs uppercase tracking-wide text-on-surface-variant">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">Signed up</th>
                <th scope="col" className="px-4 py-3 font-medium">Email</th>
                <th scope="col" className="px-4 py-3 font-medium">Source</th>
              </tr>
            </thead>
            <tbody>
              {signups.map((row) => (
                <tr key={row.id} className="border-b border-outline-variant last:border-0">
                  <td className="whitespace-nowrap px-4 py-3 text-on-surface-variant">
                    {new Date(row.created_at).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </td>
                  <th scope="row" className="px-4 py-3 text-left font-normal">
                    <a href={`mailto:${row.email}`} className={`rounded-sm text-primary hover:underline ${FOCUS_RING}`}>
                      {row.email}
                    </a>
                  </th>
                  <td className="px-4 py-3 text-on-surface-variant">{row.source_page ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
