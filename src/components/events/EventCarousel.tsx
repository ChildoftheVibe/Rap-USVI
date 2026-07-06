"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { formatEventDateBadge, formatEventTime } from "@/lib/events";
import type { EventRow } from "@/lib/events";

export function EventCarousel({ events }: { events: EventRow[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  function scrollToIndex(index: number) {
    const track = trackRef.current;
    const slide = track?.children[index];
    if (slide instanceof HTMLElement) {
      slide.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
    }
  }

  function handleScroll() {
    const track = trackRef.current;
    if (!track || track.clientWidth === 0) return;
    const index = Math.round(track.scrollLeft / track.clientWidth);
    setActiveIndex(Math.min(Math.max(index, 0), events.length - 1));
  }

  return (
    <div className="relative">
      <div
        ref={trackRef}
        onScroll={handleScroll}
        className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {events.map((eventItem) => (
          <div key={eventItem.id} className="w-full flex-none snap-center snap-always px-1">
            <EventSlide event={eventItem} />
          </div>
        ))}
      </div>

      {events.length > 1 && (
        <>
          <button
            type="button"
            aria-label="Previous event"
            onClick={() => scrollToIndex(Math.max(activeIndex - 1, 0))}
            disabled={activeIndex === 0}
            className="absolute left-2 top-1/2 hidden -translate-y-1/2 rounded-full bg-white/90 p-2 shadow-lg transition hover:bg-white disabled:pointer-events-none disabled:opacity-0 md:flex"
          >
            <span className="material-symbols-outlined text-primary" aria-hidden="true">
              chevron_left
            </span>
          </button>
          <button
            type="button"
            aria-label="Next event"
            onClick={() => scrollToIndex(Math.min(activeIndex + 1, events.length - 1))}
            disabled={activeIndex === events.length - 1}
            className="absolute right-2 top-1/2 hidden -translate-y-1/2 rounded-full bg-white/90 p-2 shadow-lg transition hover:bg-white disabled:pointer-events-none disabled:opacity-0 md:flex"
          >
            <span className="material-symbols-outlined text-primary" aria-hidden="true">
              chevron_right
            </span>
          </button>

          <div className="mt-6 flex justify-center gap-2">
            {events.map((eventItem, index) => (
              <button
                key={eventItem.id}
                type="button"
                aria-label={`Go to event ${index + 1}: ${eventItem.title}`}
                aria-current={index === activeIndex}
                onClick={() => scrollToIndex(index)}
                className={`h-2.5 rounded-full transition-all ${
                  index === activeIndex ? "w-6 bg-primary" : "w-2.5 bg-outline-variant"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function EventSlide({ event }: { event: EventRow }) {
  const badge = formatEventDateBadge(event.start_at);

  return (
    <div className="flex flex-col overflow-hidden rounded-3xl bg-white shadow-2xl lg:flex-row">
      <div className="relative h-72 lg:h-auto lg:w-1/2">
        {event.banner_url ? (
          <Image
            src={event.banner_url}
            alt={event.banner_alt || event.title}
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
        <h3 className="mb-4 font-[family-name:var(--font-headline)] text-3xl text-primary md:text-4xl">
          {event.title}
        </h3>
        <div className="mb-8 flex flex-wrap items-center gap-3 text-caribbean-azure">
          <span className="material-symbols-outlined" aria-hidden="true">
            location_on
          </span>
          <span className="font-medium">
            {event.location_name || "Location TBA"} | {formatEventTime(event.start_at)} AST
          </span>
        </div>
        {event.description && (
          <p className="mb-8 line-clamp-5 leading-relaxed text-on-surface-variant">{event.description}</p>
        )}
        <div className="flex flex-wrap gap-4">
          {event.rsvp_enabled && (
            <Link href={`/events/${event.slug}`} className="btn btn-lg btn-primary w-full sm:w-max">
              RSVP Now
            </Link>
          )}
          <a href={`/api/events/${event.slug}/ics`} className="btn btn-lg btn-outline w-full sm:w-max">
            Add to Calendar
          </a>
        </div>
        <Link
          href="/events"
          className="mt-4 inline-block rounded-sm text-sm font-medium text-caribbean-azure underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          View all upcoming events →
        </Link>
      </div>
    </div>
  );
}
