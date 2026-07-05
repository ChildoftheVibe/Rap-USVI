import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createServiceRoleClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Campaign Detail | Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const STATUS_STYLES: Record<string, string> = {
  sent: "border-secondary text-secondary",
  failed: "border-error text-error",
  skipped_unsubscribed: "border-outline text-on-surface-variant",
  pending: "border-primary text-primary",
};

export default async function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createServiceRoleClient();

  const [{ data: send }, { data: recipients, error }] = await Promise.all([
    supabase.from("email_sends").select("*").eq("id", id).maybeSingle(),
    supabase.from("email_send_recipients").select("*").eq("send_id", id).order("email", { ascending: true }),
  ]);

  if (!send) notFound();

  const counts = { sent: 0, failed: 0, skipped_unsubscribed: 0, pending: 0 };
  for (const r of recipients ?? []) {
    counts[r.status as keyof typeof counts] = (counts[r.status as keyof typeof counts] ?? 0) + 1;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-headline)] text-2xl text-on-surface">{send.subject}</h1>
        <p className="mt-1 text-on-surface-variant">
          {send.template_name} · sent by {send.sent_by ?? "unknown"} on{" "}
          {new Date(send.created_at).toLocaleString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-on-surface-variant">Sent</p>
          <p className="mt-1 text-2xl font-semibold text-secondary">{counts.sent}</p>
        </div>
        <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-on-surface-variant">Failed</p>
          <p className="mt-1 text-2xl font-semibold text-error">{counts.failed}</p>
        </div>
        <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-on-surface-variant">Skipped</p>
          <p className="mt-1 text-2xl font-semibold text-on-surface-variant">{counts.skipped_unsubscribed}</p>
        </div>
        <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-on-surface-variant">Total</p>
          <p className="mt-1 text-2xl font-semibold text-primary">{send.recipient_count}</p>
        </div>
      </div>

      {error && (
        <p role="alert" className="text-error">
          Failed to load recipient results.
        </p>
      )}

      {!error && recipients && recipients.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-outline-variant bg-surface-container-lowest">
          <table className="w-full min-w-[560px] text-left text-sm">
            <caption className="sr-only">Per-recipient send results</caption>
            <thead className="border-b border-outline-variant text-xs uppercase tracking-wide text-on-surface-variant">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">
                  Email
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Status
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Error
                </th>
              </tr>
            </thead>
            <tbody>
              {recipients.map((r) => (
                <tr key={r.id} className="border-b border-outline-variant last:border-0">
                  <td className="px-4 py-3">{r.email}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-sm border px-2 py-0.5 text-xs font-medium capitalize ${
                        STATUS_STYLES[r.status] ?? "border-outline-variant"
                      }`}
                    >
                      {r.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-on-surface-variant">{r.error ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
