import Link from "next/link";
import Image from "next/image";
import { formatEventDate, formatEventTime } from "@/lib/events";
import type { EventRow } from "@/lib/events";

type EventCardData = Pick<
  EventRow,
  "slug" | "title" | "start_at" | "location_name" | "flyer_url" | "flyer_alt"
>;

export function EventCard({ event }: { event: EventCardData }) {
  return (
    <Link
      href={`/events/${event.slug}`}
      className="group flex flex-col overflow-hidden rounded-lg border border-outline-variant bg-white shadow-sm transition-shadow hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
    >
      <div className="relative h-48 w-full overflow-hidden bg-primary">
        {event.flyer_url ? (
          <Image
            src={event.flyer_url}
            alt={event.flyer_alt || event.title}
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary to-caribbean-azure">
            <span className="material-symbols-outlined text-5xl text-white/70" aria-hidden="true">
              event
            </span>
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-caribbean-azure">
          {formatEventDate(event.start_at)}
        </p>
        <h3 className="font-[family-name:var(--font-headline)] text-xl text-primary">{event.title}</h3>
        {event.location_name && <p className="text-sm text-on-surface-variant">{event.location_name}</p>}
        <p className="mt-auto pt-2 text-sm font-medium text-primary">
          {formatEventTime(event.start_at)} AST · View details →
        </p>
      </div>
    </Link>
  );
}
