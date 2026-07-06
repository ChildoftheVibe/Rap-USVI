import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createServiceRoleClient } from "@/lib/supabase/server";
import type { EventRow, EventRsvpRow, RsvpStatus } from "@/lib/events";
import { RsvpStatusSelect } from "@/components/admin/RsvpStatusSelect";
import { RsvpCheckInToggle } from "@/components/admin/RsvpCheckInToggle";
import { DeleteRsvpButton } from "@/components/admin/DeleteRsvpButton";

export const metadata: Metadata = {
  title: "Event RSVPs | Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2";
const RSVP_STATUS_VALUES: RsvpStatus[] = ["confirmed", "waitlisted", "cancelled"];

function isRsvpStatus(value: string | undefined): value is RsvpStatus {
  return !!value && (RSVP_STATUS_VALUES as string[]).includes(value);
}

export default async function EventRsvpsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const { id } = await params;
  const { status } = await searchParams;
  const activeStatus = isRsvpStatus(status) ? status : undefined;

  const supabase = createServiceRoleClient();
  const { data: event } = await supabase.from("events").select("*").eq("id", id).maybeSingle();
  if (!event) notFound();

  let query = supabase.from("event_rsvps").select("*").eq("event_id", id).order("created_at", { ascending: false });
  if (activeStatus) query = query.eq("status", activeStatus);
  const { data: rsvps, error } = await query;

  const rows = (rsvps ?? []) as EventRsvpRow[];
  const exportHref = activeStatus
    ? `/api/admin/export/events/${id}/rsvps?status=${activeStatus}`
    : `/api/admin/export/events/${id}/rsvps`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link href={`/admin/events/${id}`} className={`text-sm text-primary hover:underline ${FOCUS_RING}`}>
            ← Back to event
          </Link>
          <h1 className="mt-1 font-[family-name:var(--font-headline)] text-2xl text-on-surface">
            RSVPs — {(event as EventRow).title}
          </h1>
        </div>
        <a
          href={exportHref}
          className={`rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 ${FOCUS_RING}`}
        >
          Download CSV
        </a>
      </div>

      <nav aria-label="Filter RSVPs by status" className="flex flex-wrap gap-2 border-b border-outline-variant pb-4">
        <Link
          href={`/admin/events/${id}/rsvps`}
          aria-current={!activeStatus ? "page" : undefined}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${FOCUS_RING} ${
            !activeStatus
              ? "bg-primary text-white"
              : "border border-outline-variant text-on-surface-variant hover:border-primary"
          }`}
        >
          All
        </Link>
        {RSVP_STATUS_VALUES.map((s) => (
          <Link
            key={s}
            href={`/admin/events/${id}/rsvps?status=${s}`}
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
          Failed to load RSVPs.
        </p>
      )}

      {!error && rows.length === 0 && <p className="text-on-surface-variant">No RSVPs yet.</p>}

      {!error && rows.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-outline-variant bg-surface-container-lowest">
          <table className="w-full min-w-[820px] text-left text-sm">
            <caption className="sr-only">RSVPs for {(event as EventRow).title}, most recent first</caption>
            <thead className="border-b border-outline-variant text-xs uppercase tracking-wide text-on-surface-variant">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">
                  Submitted
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Name
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Email
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Guests
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Status
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Check-in
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((rsvp) => (
                <tr key={rsvp.id} className="border-b border-outline-variant last:border-0 align-top">
                  <td className="whitespace-nowrap px-4 py-3 text-on-surface-variant">
                    {new Date(rsvp.created_at).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </td>
                  <th scope="row" className="px-4 py-3 text-left font-medium">
                    {rsvp.full_name}
                    {rsvp.phone && <p className="text-xs font-normal text-on-surface-variant">{rsvp.phone}</p>}
                  </th>
                  <td className="px-4 py-3">
                    <a href={`mailto:${rsvp.email}`} className={`rounded-sm text-primary hover:underline ${FOCUS_RING}`}>
                      {rsvp.email}
                    </a>
                  </td>
                  <td className="px-4 py-3 text-on-surface-variant">{rsvp.guest_count}</td>
                  <td className="px-4 py-3">
                    <RsvpStatusSelect id={rsvp.id} eventId={id} status={rsvp.status} name={rsvp.full_name} />
                  </td>
                  <td className="px-4 py-3">
                    <RsvpCheckInToggle
                      id={rsvp.id}
                      eventId={id}
                      checkedIn={!!rsvp.checked_in_at}
                      name={rsvp.full_name}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <DeleteRsvpButton id={rsvp.id} eventId={id} name={rsvp.full_name} />
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
