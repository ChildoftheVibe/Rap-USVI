import Link from "next/link";
import type { Metadata } from "next";
import { createServiceRoleClient } from "@/lib/supabase/server";
import type { DonationRow, DonationStatus } from "@/lib/donations";
import { formatUsd } from "@/lib/donations";

export const metadata: Metadata = {
  title: "Donations | Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2";
const STATUS_VALUES: DonationStatus[] = ["pending", "completed", "failed", "refunded"];

const STATUS_CHIP: Record<DonationStatus, string> = {
  completed: "bg-primary/10 text-primary",
  pending: "border border-outline-variant text-on-surface-variant",
  failed: "bg-error/10 text-error",
  refunded: "bg-error/10 text-error",
};

function isDonationStatus(value: string | undefined): value is DonationStatus {
  return !!value && (STATUS_VALUES as string[]).includes(value);
}

export default async function AdminDonationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const activeStatus = isDonationStatus(status) ? status : undefined;

  const supabase = createServiceRoleClient();

  let query = supabase.from("donations").select("*").order("created_at", { ascending: false });
  if (activeStatus) query = query.eq("status", activeStatus);
  const { data: donations, error } = await query;
  const rows = (donations ?? []) as DonationRow[];

  const { data: completedRows } = await supabase.from("donations").select("amount_cents, created_at").eq("status", "completed");
  const totalRaisedCents = (completedRows ?? []).reduce((sum, r) => sum + r.amount_cents, 0);
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const monthRaisedCents = (completedRows ?? [])
    .filter((r) => new Date(r.created_at) >= monthStart)
    .reduce((sum, r) => sum + r.amount_cents, 0);

  const exportHref = activeStatus ? `/api/admin/export/donations?status=${activeStatus}` : "/api/admin/export/donations";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-[family-name:var(--font-headline)] text-2xl text-on-surface">Donations</h1>
        <div className="flex gap-3">
          <Link
            href="/admin/donations/receipt-template"
            className={`rounded-lg border border-outline-variant px-4 py-2 text-sm font-medium text-on-surface-variant transition-colors hover:border-primary hover:text-primary ${FOCUS_RING}`}
          >
            Receipt template
          </Link>
          <a
            href={exportHref}
            className={`rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 ${FOCUS_RING}`}
          >
            Download CSV
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-6">
          <p className="text-sm font-medium uppercase tracking-wide text-on-surface-variant">Total Raised</p>
          <p className="mt-2 text-3xl font-semibold text-primary">{formatUsd(totalRaisedCents)}</p>
        </div>
        <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-6">
          <p className="text-sm font-medium uppercase tracking-wide text-on-surface-variant">Completed Gifts</p>
          <p className="mt-2 text-3xl font-semibold text-primary">{(completedRows ?? []).length}</p>
        </div>
        <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-6">
          <p className="text-sm font-medium uppercase tracking-wide text-on-surface-variant">This Month</p>
          <p className="mt-2 text-3xl font-semibold text-primary">{formatUsd(monthRaisedCents)}</p>
        </div>
      </div>

      <nav aria-label="Filter donations by status" className="flex flex-wrap gap-2 border-b border-outline-variant pb-4">
        <Link
          href="/admin/donations"
          aria-current={!activeStatus ? "page" : undefined}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${FOCUS_RING} ${
            !activeStatus ? "bg-primary text-white" : "border border-outline-variant text-on-surface-variant hover:border-primary"
          }`}
        >
          All
        </Link>
        {STATUS_VALUES.map((s) => (
          <Link
            key={s}
            href={`/admin/donations?status=${s}`}
            aria-current={activeStatus === s ? "page" : undefined}
            className={`rounded-full px-4 py-1.5 text-sm font-medium capitalize transition-colors ${FOCUS_RING} ${
              activeStatus === s
                ? "bg-primary text-white"
                : "border border-outline-variant text-on-surface-variant hover:border-primary"
            }`}
          >
            {s}
          </Link>
        ))}
      </nav>

      {error && (
        <p role="alert" className="text-error">
          Failed to load donations.
        </p>
      )}

      {!error && rows.length === 0 && <p className="text-on-surface-variant">No donations yet.</p>}

      {!error && rows.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-outline-variant bg-surface-container-lowest">
          <table className="w-full min-w-[860px] text-left text-sm">
            <caption className="sr-only">Donations, most recent first</caption>
            <thead className="border-b border-outline-variant text-xs uppercase tracking-wide text-on-surface-variant">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">Date</th>
                <th scope="col" className="px-4 py-3 font-medium">Donor</th>
                <th scope="col" className="px-4 py-3 font-medium">Amount</th>
                <th scope="col" className="px-4 py-3 font-medium">Status</th>
                <th scope="col" className="px-4 py-3 font-medium">Dedication</th>
                <th scope="col" className="px-4 py-3 font-medium">PayPal IDs</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((donation) => (
                <tr key={donation.id} className="border-b border-outline-variant last:border-0 align-top">
                  <td className="whitespace-nowrap px-4 py-3 text-on-surface-variant">
                    {new Date(donation.created_at).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </td>
                  <th scope="row" className="px-4 py-3 text-left font-medium">
                    {donation.donor_name || donation.payer_name || "—"}
                    <p className="text-xs font-normal text-on-surface-variant">
                      {donation.donor_email || donation.payer_email || "No email on file"}
                    </p>
                  </th>
                  <td className="whitespace-nowrap px-4 py-3 font-medium">{formatUsd(donation.amount_cents)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full px-3 py-1 text-xs font-medium capitalize ${STATUS_CHIP[donation.status]}`}>
                      {donation.status}
                    </span>
                  </td>
                  <td className="max-w-[200px] truncate px-4 py-3 text-on-surface-variant">
                    {donation.dedication || "—"}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-on-surface-variant">
                    {donation.paypal_capture_id ?? donation.paypal_order_id ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
