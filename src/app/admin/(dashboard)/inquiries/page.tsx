import Link from "next/link";
import type { Metadata } from "next";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { interestAreas } from "@/lib/content";
import { StatusSelect } from "@/components/admin/StatusSelect";

export const metadata: Metadata = {
  title: "Inquiries | Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const INTEREST_VALUES = interestAreas.map((a) => a.value);
const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2";

function isInterestArea(value: string | undefined): value is (typeof INTEREST_VALUES)[number] {
  return !!value && (INTEREST_VALUES as string[]).includes(value);
}

export default async function AdminInquiriesPage({
  searchParams,
}: {
  searchParams: Promise<{ interest?: string }>;
}) {
  const { interest } = await searchParams;
  const activeInterest = isInterestArea(interest) ? interest : undefined;
  const activeLabel = interestAreas.find((a) => a.value === activeInterest)?.label;

  const supabase = createServiceRoleClient();
  let query = supabase.from("inquiries").select("*").order("created_at", { ascending: false });
  if (activeInterest) {
    query = query.eq("interest_area", activeInterest);
  }
  const { data: inquiries, error } = await query;

  const exportHref = activeInterest
    ? `/api/admin/export/inquiries?interest=${activeInterest}`
    : "/api/admin/export/inquiries";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-[family-name:var(--font-headline)] text-2xl text-on-surface">Inquiries</h1>
        <a
          href={exportHref}
          className={`rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 ${FOCUS_RING}`}
        >
          Download CSV{activeLabel ? ` (${activeLabel})` : ""}
        </a>
      </div>

      <nav aria-label="Filter inquiries by category" className="flex flex-wrap gap-2 border-b border-outline-variant pb-4">
        <Link
          href="/admin/inquiries"
          aria-current={!activeInterest ? "page" : undefined}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${FOCUS_RING} ${
            !activeInterest ? "bg-primary text-white" : "border border-outline-variant text-on-surface-variant hover:border-primary"
          }`}
        >
          All
        </Link>
        {interestAreas.map((area) => (
          <Link
            key={area.value}
            href={`/admin/inquiries?interest=${area.value}`}
            aria-current={activeInterest === area.value ? "page" : undefined}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${FOCUS_RING} ${
              activeInterest === area.value
                ? "bg-primary text-white"
                : "border border-outline-variant text-on-surface-variant hover:border-primary"
            }`}
          >
            {area.label}
          </Link>
        ))}
      </nav>

      {error && (
        <p role="alert" className="text-error">
          Failed to load inquiries.
        </p>
      )}

      {!error && (!inquiries || inquiries.length === 0) && (
        <p className="text-on-surface-variant">No inquiries yet.</p>
      )}

      {!error && inquiries && inquiries.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-outline-variant bg-surface-container-lowest">
          <table className="w-full min-w-[720px] text-left text-sm">
            <caption className="sr-only">
              Stakeholder inquiries{activeLabel ? ` filtered to ${activeLabel}` : ""}, most recent first
            </caption>
            <thead className="border-b border-outline-variant text-xs uppercase tracking-wide text-on-surface-variant">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">Submitted</th>
                <th scope="col" className="px-4 py-3 font-medium">Name</th>
                <th scope="col" className="px-4 py-3 font-medium">Email</th>
                <th scope="col" className="px-4 py-3 font-medium">Interest</th>
                <th scope="col" className="px-4 py-3 font-medium">Message</th>
                <th scope="col" className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {inquiries.map((row) => (
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
                  <td className="px-4 py-3">
                    <a href={`mailto:${row.email}`} className={`rounded-sm text-primary hover:underline ${FOCUS_RING}`}>
                      {row.email}
                    </a>
                  </td>
                  <td className="px-4 py-3 text-on-surface-variant">
                    {interestAreas.find((a) => a.value === row.interest_area)?.label ?? row.interest_area}
                  </td>
                  <td className="max-w-xs px-4 py-3 text-on-surface-variant">
                    <p className="line-clamp-3">{row.message}</p>
                  </td>
                  <td className="px-4 py-3">
                    <StatusSelect id={row.id} status={row.status} name={row.full_name} />
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
