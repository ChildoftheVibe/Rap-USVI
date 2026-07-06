import { createServiceRoleClient } from "@/lib/supabase/server";
import { EventCarousel } from "@/components/events/EventCarousel";
import type { EventRow } from "@/lib/events";

// Same filter as the all-events page: published events, ending in the future,
// soonest first — so this section always mirrors what's live on /events.
async function getUpcomingEvents(): Promise<EventRow[]> {
  const supabase = createServiceRoleClient();
  const nowIso = new Date().toISOString();

  const { data } = await supabase
    .from("events")
    .select("*")
    .eq("status", "published")
    .gte("end_at", nowIso)
    .order("start_at", { ascending: true })
    .limit(8);

  return (data ?? []) as EventRow[];
}

export async function CommunityEvent() {
  const events = await getUpcomingEvents();
  if (events.length === 0) return null;

  return (
    <section className="bg-island-sand py-24" id="events">
      <div className="mx-auto max-w-container-max px-margin-mobile md:px-margin-desktop">
        <div className="mb-12 max-w-2xl">
          <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-caribbean-azure">
            Community Calendar
          </p>
          <h2 className="font-[family-name:var(--font-headline)] text-3xl text-primary md:text-4xl">
            Upcoming Events
          </h2>
        </div>
        <EventCarousel events={events} />
      </div>
    </section>
  );
}
