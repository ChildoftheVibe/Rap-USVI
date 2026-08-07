import { site } from "@/lib/content";
import type { EventRow } from "@/lib/events";

function toIcsUtc(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

/**
 * Escapes text per RFC 5545 (backslash, comma, semicolon, then line breaks).
 *
 * All three line-break forms are collapsed together: a bare CR left in the
 * output would terminate the content line early and let the remainder be
 * parsed as a new iCalendar property.
 */
function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;")
    .replace(/\r\n|\r|\n/g, "\\n");
}

/**
 * Folds a content line to 75 octets per RFC 5545 §3.1. Splits on octet
 * boundaries, never inside a UTF-8 sequence.
 */
function foldIcsLine(line: string): string {
  const bytes = Buffer.from(line, "utf8");
  if (bytes.length <= 75) return line;

  const chunks: string[] = [];
  let start = 0;
  // Continuation lines carry a leading space, so they hold one octet less.
  let limit = 75;

  while (start < bytes.length) {
    let end = Math.min(start + limit, bytes.length);
    while (end > start && end < bytes.length && (bytes[end]! & 0xc0) === 0x80) end--;
    chunks.push(bytes.subarray(start, end).toString("utf8"));
    start = end;
    limit = 74;
  }

  return chunks.join("\r\n ");
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
  return lines.map(foldIcsLine).join("\r\n");
}
