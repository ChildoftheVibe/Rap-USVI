import type { Metadata } from "next";
import Link from "next/link";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { availabilityDays, availabilityHoursOptions, commitmentLevels, certificationOptions } from "@/lib/content";
import { VolunteerStatusSelect } from "@/components/admin/VolunteerStatusSelect";

export const metadata: Metadata = {
  title: "Volunteers | Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const STATUS_VALUES = ["new", "contacted", "active", "inactive"] as const;
const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2";

function isStatus(value: string | undefined): value is (typeof STATUS_VALUES)[number] {
  return !!value && (STATUS_VALUES as readonly string[]).includes(value);
}

function labelFor(list: readonly { value: string; label: string }[], value: string): string {
  return list.find((item) => item.value === value)?.label ?? value;
}

export default async function AdminVolunteersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const activeStatus = isStatus(status) ? status : undefined;

  const supabase = createServiceRoleClient();
  let query = supabase.from("volunteers").select("*").order("created_at", { ascending: false });
  if (activeStatus) {
    query = query.eq("status", activeStatus);
  }
  const { data: volunteers, error } = await query;

  const exportHref = activeStatus
    ? `/api/admin/export/volunteers?status=${activeStatus}`
    : "/api/admin/export/volunteers";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-[family-name:var(--font-headline)] text-2xl text-on-surface">Volunteers</h1>
        <a
          href={exportHref}
          className={`rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 ${FOCUS_RING}`}
        >
          Download CSV{activeStatus ? ` (${activeStatus})` : ""}
        </a>
      </div>

      <nav aria-label="Filter volunteers by status" className="flex flex-wrap gap-2 border-b border-outline-variant pb-4">
        <Link
          href="/admin/volunteers"
          aria-current={!activeStatus ? "page" : undefined}
          className={`rounded-full px-4 py-1.5 text-sm font-medium capitalize transition-colors ${FOCUS_RING} ${
            !activeStatus ? "bg-primary text-white" : "border border-outline-variant text-on-surface-variant hover:border-primary"
          }`}
        >
          All
        </Link>
        {STATUS_VALUES.map((value) => (
          <Link
            key={value}
            href={`/admin/volunteers?status=${value}`}
            aria-current={activeStatus === value ? "page" : undefined}
            className={`rounded-full px-4 py-1.5 text-sm font-medium capitalize transition-colors ${FOCUS_RING} ${
              activeStatus === value
                ? "bg-primary text-white"
                : "border border-outline-variant text-on-surface-variant hover:border-primary"
            }`}
          >
            {value}
          </Link>
        ))}
      </nav>

      {error && (
        <p role="alert" className="text-error">
          Failed to load volunteers.
        </p>
      )}

      {!error && (!volunteers || volunteers.length === 0) && (
        <p className="text-on-surface-variant">No volunteers yet.</p>
      )}

      {!error && volunteers && volunteers.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-outline-variant bg-surface-container-lowest">
          <table className="w-full min-w-[960px] text-left text-sm">
            <caption className="sr-only">
              Volunteer sign-ups{activeStatus ? ` filtered to ${activeStatus}` : ""}, most recent first
            </caption>
            <thead className="border-b border-outline-variant text-xs uppercase tracking-wide text-on-surface-variant">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">Submitted</th>
                <th scope="col" className="px-4 py-3 font-medium">Name</th>
                <th scope="col" className="px-4 py-3 font-medium">Contact</th>
                <th scope="col" className="px-4 py-3 font-medium">Industry</th>
                <th scope="col" className="px-4 py-3 font-medium">Availability</th>
                <th scope="col" className="px-4 py-3 font-medium">Commitment</th>
                <th scope="col" className="px-4 py-3 font-medium">Certifications</th>
                <th scope="col" className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {volunteers.map((row) => (
                <tr key={row.id} className="border-b border-outline-variant last:border-0 align-top">
                  <td className="whitespace-nowrap px-4 py-3 text-on-surface-variant">
                    {new Date(row.created_at).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </td>
                  <th scope="row" className="px-4 py-3 text-left font-medium">
                    {row.full_name}
                  </th>
                  <td className="px-4 py-3 text-on-surface-variant">
                    <a href={`mailto:${row.email}`} className={`block rounded-sm text-primary hover:underline ${FOCUS_RING}`}>
                      {row.email}
                    </a>
                    <a href={`tel:${row.phone}`} className={`block rounded-sm text-primary hover:underline ${FOCUS_RING}`}>
                      {row.phone}
                    </a>
                  </td>
                  <td className="px-4 py-3 text-on-surface-variant">{row.industry}</td>
                  <td className="max-w-xs px-4 py-3 text-on-surface-variant">
                    <p>{(row.availability_days ?? []).map((d: string) => labelFor(availabilityDays, d)).join(", ")}</p>
                    <p>{labelFor(availabilityHoursOptions, row.availability_hours)}</p>
                  </td>
                  <td className="px-4 py-3 text-on-surface-variant">{labelFor(commitmentLevels, row.commitment_level)}</td>
                  <td className="px-4 py-3 text-on-surface-variant">
                    {(row.certifications ?? []).map((c: string) => labelFor(certificationOptions, c)).join(", ") || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <VolunteerStatusSelect id={row.id} status={row.status} name={row.full_name} />
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
