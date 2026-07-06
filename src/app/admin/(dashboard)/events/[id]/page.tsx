import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { isoToAstLocalInput } from "@/lib/events";
import type { EventRow, EventMediaRow } from "@/lib/events";
import { EventForm, type EventFormInitial } from "@/components/admin/EventForm";

export const metadata: Metadata = {
  title: "Edit Event | Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

function toFormInitial(event: EventRow): EventFormInitial {
  return {
    title: event.title,
    slug: event.slug,
    description: event.description,
    locationName: event.location_name,
    locationAddress: event.location_address,
    startAt: isoToAstLocalInput(event.start_at),
    endAt: isoToAstLocalInput(event.end_at),
    status: event.status,
    capacity: event.capacity,
    waitlistEnabled: event.waitlist_enabled,
    rsvpEnabled: event.rsvp_enabled,
    bannerAlt: event.banner_alt ?? "",
    bannerUrl: event.banner_url,
    flyer3x5Url: event.flyer_3x5_url,
    flyer4x5Url: event.flyer_4x5_url,
    flyer9x16Url: event.flyer_9x16_url,
    popupEnabled: event.popup_enabled,
    popupHeadline: event.popup_headline ?? "",
    popupBody: event.popup_body ?? "",
    popupCtaLabel: event.popup_cta_label,
    popupStartsAt: event.popup_starts_at ? isoToAstLocalInput(event.popup_starts_at) : "",
    popupEndsAt: event.popup_ends_at ? isoToAstLocalInput(event.popup_ends_at) : "",
    popupImageSource: event.popup_image_source,
  };
}

export default async function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createServiceRoleClient();
  const { data: event } = await supabase.from("events").select("*").eq("id", id).maybeSingle();

  if (!event) notFound();

  const { data: media } = await supabase
    .from("event_media")
    .select("id, event_id, media_type, url, path, alt, created_at")
    .eq("event_id", id)
    .order("created_at", { ascending: true });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-[family-name:var(--font-headline)] text-2xl text-on-surface">Edit Event</h1>
        <Link
          href={`/admin/events/${id}/rsvps`}
          className="rounded-lg border border-outline-variant px-4 py-2 text-sm font-medium text-on-surface-variant transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          Manage RSVPs
        </Link>
      </div>
      <EventForm
        mode="edit"
        eventId={id}
        initial={toFormInitial(event as EventRow)}
        initialMedia={(media ?? []) as EventMediaRow[]}
      />
    </div>
  );
}
