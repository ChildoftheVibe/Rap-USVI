import type { Metadata } from "next";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { EventCard } from "@/components/events/EventCard";
import { formatEventDate } from "@/lib/events";
import type { EventRow } from "@/lib/events";
import { site } from "@/lib/content";

export const metadata: Metadata = {
  title: `Upcoming Events | ${site.name}`,
  description: "RSVP for upcoming community events hosted by Restore America's Paradise.",
};

// Capacity/waitlist state must always be live, and this must never depend on
// Supabase being reachable at build time — same reasoning as the admin pages.
export const dynamic = "force-dynamic";

export default async function EventsPage() {
  const supabase = createServiceRoleClient();
  const nowIso = new Date().toISOString();

  const [{ data: upcoming }, { data: past }] = await Promise.all([
    supabase
      .from("events")
      .select("*")
      .eq("status", "published")
      .gte("end_at", nowIso)
      .order("start_at", { ascending: true }),
    supabase
      .from("events")
      .select("*")
      .eq("status", "published")
      .lt("end_at", nowIso)
      .order("start_at", { ascending: false })
      .limit(6),
  ]);

  const upcomingEvents = (upcoming ?? []) as EventRow[];
  const pastEvents = (past ?? []) as EventRow[];

  return (
    <div className="mx-auto max-w-container-max px-margin-mobile py-16 md:px-margin-desktop md:py-24">
      <div className="mb-12 max-w-2xl">
        <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-caribbean-azure">
          Community Calendar
        </p>
        <h1 className="font-[family-name:var(--font-headline)] text-4xl text-primary md:text-5xl">
          Upcoming Events
        </h1>
        <p className="mt-4 text-lg text-on-surface-variant">
          Join us at an upcoming gathering. RSVP below to reserve your spot.
        </p>
      </div>

      {upcomingEvents.length === 0 && (
        <p className="rounded-lg border border-outline-variant bg-surface-container-lowest p-8 text-center text-on-surface-variant">
          No upcoming events right now — check back soon.
        </p>
      )}

      {upcomingEvents.length > 0 && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {upcomingEvents.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}

      {pastEvents.length > 0 && (
        <div className="mt-20">
          <h2 className="mb-6 font-[family-name:var(--font-headline)] text-2xl text-primary">Past Events</h2>
          <ul className="divide-y divide-outline-variant rounded-lg border border-outline-variant bg-surface-container-lowest">
            {pastEvents.map((event) => (
              <li key={event.id} className="px-6 py-4">
                <p className="font-medium text-on-surface">{event.title}</p>
                <p className="text-sm text-on-surface-variant">{formatEventDate(event.start_at)}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
