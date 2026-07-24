import Image from "next/image";
import Link from "next/link";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { EventCarousel } from "@/components/events/EventCarousel";
import { formatEventDateBadge, formatEventTime } from "@/lib/events";
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

async function getMostRecentPastEvent(): Promise<EventRow | null> {
  const supabase = createServiceRoleClient();
  const nowIso = new Date().toISOString();

  const { data } = await supabase
    .from("events")
    .select("*")
    .eq("status", "published")
    .lt("end_at", nowIso)
    .order("start_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (data as EventRow | null) ?? null;
}

async function eventHasMedia(eventId: string): Promise<boolean> {
  const supabase = createServiceRoleClient();
  const { count } = await supabase
    .from("event_media")
    .select("id", { count: "exact", head: true })
    .eq("event_id", eventId);

  return (count ?? 0) > 0;
}

function SectionHeading({ heading }: { heading: string }) {
  return (
    <div className="mb-12 max-w-2xl">
      <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-caribbean-azure">Community Calendar</p>
      <h2 className="font-[family-name:var(--font-headline)] text-3xl text-primary md:text-4xl">{heading}</h2>
    </div>
  );
}

export async function CommunityEvent() {
  const upcomingEvents = await getUpcomingEvents();

  if (upcomingEvents.length > 0) {
    return (
      <section className="bg-island-sand py-24" id="events">
        <div className="mx-auto max-w-container-max px-margin-mobile md:px-margin-desktop">
          <SectionHeading heading="Upcoming Events" />
          <EventCarousel events={upcomingEvents} />
        </div>
      </section>
    );
  }

  const pastEvent = await getMostRecentPastEvent();
  if (!pastEvent) return null;

  const hasMedia = await eventHasMedia(pastEvent.id);
  const badge = formatEventDateBadge(pastEvent.start_at);

  return (
    <section className="bg-island-sand py-24" id="events">
      <div className="mx-auto max-w-container-max px-margin-mobile md:px-margin-desktop">
        <SectionHeading heading="No Upcoming Events — Revisit Our Last Gathering" />
        <div className="flex flex-col overflow-hidden rounded-3xl bg-white shadow-2xl lg:flex-row">
          <div className="relative h-72 lg:h-auto lg:w-1/2">
            {pastEvent.banner_url ? (
              <Image
                src={pastEvent.banner_url}
                alt={pastEvent.banner_alt || pastEvent.title}
                fill
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary to-caribbean-azure">
                <span className="material-symbols-outlined text-6xl text-white/70" aria-hidden="true">
                  event
                </span>
              </div>
            )}
            <div className="absolute left-8 top-8 min-w-[100px] rounded-lg bg-harvest-gold p-4 text-center text-primary shadow-lg">
              <span className="block text-2xl font-bold">
                {badge.month} {badge.day}
              </span>
              <span className="text-sm font-bold">{badge.year}</span>
            </div>
          </div>
          <div className="flex flex-col justify-center p-12 lg:w-1/2 lg:p-20">
            <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-caribbean-azure">Past Event</p>
            <h3 className="mb-4 font-[family-name:var(--font-headline)] text-3xl text-primary md:text-4xl">
              {pastEvent.title}
            </h3>
            <div className="mb-8 flex flex-wrap items-center gap-3 text-caribbean-azure">
              <span className="material-symbols-outlined" aria-hidden="true">
                location_on
              </span>
              <span className="font-medium">
                {pastEvent.location_name || "Location TBA"} | {formatEventTime(pastEvent.start_at)} AST
              </span>
            </div>
            {pastEvent.description && (
              <div
                className="mb-8 line-clamp-5 leading-relaxed text-on-surface-variant [&_p]:mb-2 [&_p:last-child]:mb-0"
                dangerouslySetInnerHTML={{ __html: pastEvent.description }}
              />
            )}
            <div className="flex flex-wrap gap-4">
              {hasMedia ? (
                <Link href={`/events/${pastEvent.slug}#gallery`} className="btn btn-lg btn-outline w-full sm:w-max">
                  View Gallery
                </Link>
              ) : (
                <button
                  type="button"
                  disabled
                  aria-disabled="true"
                  title="No photos or videos have been added to this event yet"
                  className="btn btn-lg btn-outline w-full sm:w-max"
                >
                  Gallery
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
