import Link from "next/link";
import type { Metadata } from "next";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { eventStatusValues } from "@/lib/validation/event";
import { formatEventDate, getEventRsvpSummary } from "@/lib/events";
import type { EventRow } from "@/lib/events";
import { EventStatusToggle } from "@/components/admin/EventStatusToggle";

export const metadata: Metadata = {
  title: "Events | Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2";

function isEventStatus(value: string | undefined): value is (typeof eventStatusValues)[number] {
  return !!value && (eventStatusValues as readonly string[]).includes(value);
}

export default async function AdminEventsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const activeStatus = isEventStatus(status) ? status : undefined;

  const supabase = createServiceRoleClient();
  let query = supabase.from("events").select("*").order("start_at", { ascending: false });
  if (activeStatus) query = query.eq("status", activeStatus);
  const { data: events, error } = await query;

  const eventRows = (events ?? []) as EventRow[];
  const summaries = await Promise.all(eventRows.map((event) => getEventRsvpSummary(supabase, event.id)));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-[family-name:var(--font-headline)] text-2xl text-on-surface">Events</h1>
        <Link
          href="/admin/events/new"
          className={`rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 ${FOCUS_RING}`}
        >
          New Event
        </Link>
      </div>

      <nav aria-label="Filter events by status" className="flex flex-wrap gap-2 border-b border-outline-variant pb-4">
        <Link
          href="/admin/events"
          aria-current={!activeStatus ? "page" : undefined}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${FOCUS_RING} ${
            !activeStatus
              ? "bg-primary text-white"
              : "border border-outline-variant text-on-surface-variant hover:border-primary"
          }`}
        >
          All
        </Link>
        {eventStatusValues.map((s) => (
          <Link
            key={s}
            href={`/admin/events?status=${s}`}
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
          Failed to load events.
        </p>
      )}

      {!error && eventRows.length === 0 && <p className="text-on-surface-variant">No events yet.</p>}

      {!error && eventRows.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-outline-variant bg-surface-container-lowest">
          <table className="w-full min-w-[820px] text-left text-sm">
            <caption className="sr-only">Events, most recent start date first</caption>
            <thead className="border-b border-outline-variant text-xs uppercase tracking-wide text-on-surface-variant">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">
                  Event
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Date
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Status
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  RSVPs
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Popup
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {eventRows.map((event, i) => {
                const summary = summaries[i];
                return (
                  <tr key={event.id} className="border-b border-outline-variant last:border-0 align-top">
                    <th scope="row" className="px-4 py-3 text-left font-medium">
                      {event.title}
                      <p className="text-xs font-normal text-on-surface-variant">/{event.slug}</p>
                    </th>
                    <td className="whitespace-nowrap px-4 py-3 text-on-surface-variant">
                      {formatEventDate(event.start_at)}
                    </td>
                    <td className="px-4 py-3">
                      <EventStatusToggle id={event.id} status={event.status} />
                    </td>
                    <td className="px-4 py-3 text-on-surface-variant">
                      {summary.confirmedHeadcount}
                      {event.capacity ? ` / ${event.capacity}` : ""} confirmed
                      {summary.waitlistedHeadcount > 0 ? `, ${summary.waitlistedHeadcount} waitlisted` : ""}
                    </td>
                    <td className="px-4 py-3 text-on-surface-variant">{event.popup_enabled ? "On" : "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-3">
                        <Link href={`/admin/events/${event.id}`} className={`rounded-sm text-primary hover:underline ${FOCUS_RING}`}>
                          Edit
                        </Link>
                        <Link
                          href={`/admin/events/${event.id}/rsvps`}
                          className={`rounded-sm text-primary hover:underline ${FOCUS_RING}`}
                        >
                          RSVPs
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
