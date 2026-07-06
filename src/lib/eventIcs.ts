import { site } from "@/lib/content";
import type { EventRow } from "@/lib/events";

function toIcsUtc(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

/** Escapes text per RFC 5545 (backslash, comma, semicolon, then newlines). */
function escapeIcsText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/,/g, "\\,").replace(/;/g, "\\;").replace(/\n/g, "\\n");
}

/** Builds a minimal, valid .ics file for a single dynamic event. */
export function buildEventIcs(event: Pick<EventRow, "id" | "slug" | "title" | "description" | "start_at" | "end_at" | "location_name" | "location_address">): string {
  const now = toIcsUtc(new Date().toISOString());
  const location = [event.location_name, event.location_address].filter(Boolean).join(", ");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Restore America's Paradise//rap-usvi.org//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:event-${event.id}@rap-usvi.org`,
    `DTSTAMP:${now}`,
    `DTSTART:${toIcsUtc(event.start_at)}`,
    `DTEND:${toIcsUtc(event.end_at)}`,
    `SUMMARY:${escapeIcsText(event.title)}`,
    `DESCRIPTION:${escapeIcsText(event.description)}`,
    ...(location ? [`LOCATION:${escapeIcsText(location)}`] : []),
    `URL:${site.url}/events/${event.slug}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.join("\r\n");
}
