import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { computeAvailability, formatEventDateRange, getEventRsvpSummary } from "@/lib/events";
import type { EventRow } from "@/lib/events";
import { EventRsvpForm } from "@/components/forms/EventRsvpForm";
import { site } from "@/lib/content";

// Capacity/spots-left must always be live, and this must never depend on
// Supabase being reachable at build time — same reasoning as the admin pages.
export const dynamic = "force-dynamic";

async function getPublishedEvent(slug: string): Promise<EventRow | null> {
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("events")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  return data as EventRow | null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const event = await getPublishedEvent(slug);
  if (!event) return { title: `Event | ${site.name}` };
  return {
    title: `${event.title} | ${site.name}`,
    description: event.description ? event.description.slice(0, 160) : undefined,
  };
}

export default async function EventDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await getPublishedEvent(slug);
  if (!event) notFound();

  const supabase = createServiceRoleClient();
  const summary = await getEventRsvpSummary(supabase, event.id);
  const availability = computeAvailability(event.capacity, summary.confirmedHeadcount);
  const isPast = new Date(event.end_at) < new Date();
  const rsvpOpen = event.rsvp_enabled && !isPast;

  return (
    <article>
      <div className="relative h-72 w-full overflow-hidden bg-primary md:h-96">
        {event.flyer_url ? (
          <Image
            src={event.flyer_url}
            alt={event.flyer_alt || event.title}
            fill
            sizes="100vw"
            className="object-cover"
            priority
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary to-caribbean-azure">
            <span className="material-symbols-outlined text-7xl text-white/70" aria-hidden="true">
              event
            </span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 mx-auto max-w-container-max px-margin-mobile pb-8 md:px-margin-desktop">
          <h1 className="font-[family-name:var(--font-headline)] text-3xl text-white md:text-5xl">{event.title}</h1>
        </div>
      </div>

      <div className="mx-auto grid max-w-container-max grid-cols-1 gap-12 px-margin-mobile py-16 md:px-margin-desktop lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="flex flex-wrap items-center gap-3 text-caribbean-azure">
            <span className="material-symbols-outlined" aria-hidden="true">
              calendar_month
            </span>
            <span className="font-medium">{formatEventDateRange(event.start_at, event.end_at)}</span>
          </div>
          {event.location_name && (
            <div className="flex flex-wrap items-center gap-3 text-caribbean-azure">
              <span className="material-symbols-outlined" aria-hidden="true">
                location_on
              </span>
              <span className="font-medium">
                {event.location_name}
                {event.location_address ? ` — ${event.location_address}` : ""}
              </span>
            </div>
          )}
          {event.description && (
            <p className="whitespace-pre-line leading-relaxed text-on-surface-variant">{event.description}</p>
          )}
          <a href={`/api/events/${event.slug}/ics`} className="btn btn-md btn-outline w-full sm:w-max">
            Add to Calendar
          </a>
        </div>

        <div>
          {isPast ? (
            <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-8 text-center">
              <p className="text-on-surface-variant">This event has already taken place.</p>
            </div>
          ) : !rsvpOpen ? (
            <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-8 text-center">
              <p className="text-on-surface-variant">RSVPs are closed for this event.</p>
            </div>
          ) : (
            <EventRsvpForm
              slug={event.slug}
              capacity={availability.capacity}
              spotsLeft={availability.spotsLeft}
              isFull={availability.isFull}
              waitlistEnabled={event.waitlist_enabled}
            />
          )}
        </div>
      </div>
    </article>
  );
}
