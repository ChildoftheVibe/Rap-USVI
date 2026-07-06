import type { SupabaseClient } from "@supabase/supabase-js";
import type { EventStatus } from "@/lib/validation/event";

/** All events are U.S. Virgin Islands based and never observe DST. */
export const EVENT_TIMEZONE = "America/St_Thomas";
const AST_FIXED_OFFSET = "-04:00";

export interface EventRow {
  id: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  slug: string;
  title: string;
  description: string;
  location_name: string;
  location_address: string;
  timezone: string;
  start_at: string;
  end_at: string;
  status: EventStatus;
  capacity: number | null;
  waitlist_enabled: boolean;
  rsvp_enabled: boolean;
  flyer_url: string | null;
  flyer_path: string | null;
  flyer_alt: string | null;
  popup_enabled: boolean;
  popup_headline: string | null;
  popup_body: string | null;
  popup_cta_label: string;
  popup_starts_at: string | null;
  popup_ends_at: string | null;
}

export type RsvpStatus = "confirmed" | "waitlisted" | "cancelled";

export interface EventRsvpRow {
  id: string;
  created_at: string;
  updated_at: string;
  event_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  guest_count: number;
  status: RsvpStatus;
  cancel_token: string;
  checked_in_at: string | null;
  notified_at: string | null;
  notify_error: string | null;
  promoted_at: string | null;
}

/** URL-safe slug: lowercase, hyphen-separated, ASCII alphanumerics only. */
export function slugify(input: string): string {
  const slug = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 200);
  return slug || "event";
}

/** Treats a `datetime-local` input value as America/St_Thomas wall-clock time and returns an ISO instant. */
export function astLocalInputToIso(local: string): string {
  return `${local}:00${AST_FIXED_OFFSET}`;
}

/** Converts an ISO instant to the `YYYY-MM-DDTHH:mm` value an AST wall clock would show, for editing in a `datetime-local` input. */
export function isoToAstLocalInput(iso: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: EVENT_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(iso));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

const AST_DATE_FORMAT = new Intl.DateTimeFormat("en-US", {
  timeZone: EVENT_TIMEZONE,
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric",
});
const AST_TIME_FORMAT = new Intl.DateTimeFormat("en-US", {
  timeZone: EVENT_TIMEZONE,
  hour: "numeric",
  minute: "2-digit",
});

export function formatEventDate(iso: string): string {
  return AST_DATE_FORMAT.format(new Date(iso));
}

export function formatEventTime(iso: string): string {
  return AST_TIME_FORMAT.format(new Date(iso));
}

/** Human-readable "Friday, July 22, 2026 · 8:00 AM – 10:00 AM AST" (or spanning dates if multi-day). */
export function formatEventDateRange(startIso: string, endIso: string): string {
  const sameDay = AST_DATE_FORMAT.format(new Date(startIso)) === AST_DATE_FORMAT.format(new Date(endIso));
  if (sameDay) {
    return `${formatEventDate(startIso)} · ${formatEventTime(startIso)} – ${formatEventTime(endIso)} AST`;
  }
  return `${formatEventDate(startIso)} ${formatEventTime(startIso)} AST – ${formatEventDate(endIso)} ${formatEventTime(endIso)} AST`;
}

export interface EventAvailability {
  capacity: number | null;
  confirmedHeadcount: number;
  spotsLeft: number | null;
  isFull: boolean;
}

/** `capacity` is total headcount (registrant + guests), matching the `rsvp_for_event` RPC's accounting. */
export function computeAvailability(capacity: number | null, confirmedHeadcount: number): EventAvailability {
  return {
    capacity,
    confirmedHeadcount,
    spotsLeft: capacity === null ? null : Math.max(capacity - confirmedHeadcount, 0),
    isFull: capacity !== null && confirmedHeadcount >= capacity,
  };
}

export interface EventRsvpSummary {
  confirmedHeadcount: number;
  waitlistedHeadcount: number;
  confirmedCount: number;
  waitlistedCount: number;
  cancelledCount: number;
}

/** Small enough scale (nonprofit events) that summing client-side beats standing up a DB view. */
export async function getEventRsvpSummary(
  supabase: SupabaseClient,
  eventId: string
): Promise<EventRsvpSummary> {
  const { data } = await supabase.from("event_rsvps").select("status, guest_count").eq("event_id", eventId);

  const summary: EventRsvpSummary = {
    confirmedHeadcount: 0,
    waitlistedHeadcount: 0,
    confirmedCount: 0,
    waitlistedCount: 0,
    cancelledCount: 0,
  };

  for (const row of data ?? []) {
    const headcount = 1 + (row.guest_count ?? 0);
    if (row.status === "confirmed") {
      summary.confirmedHeadcount += headcount;
      summary.confirmedCount += 1;
    } else if (row.status === "waitlisted") {
      summary.waitlistedHeadcount += headcount;
      summary.waitlistedCount += 1;
    } else {
      summary.cancelledCount += 1;
    }
  }

  return summary;
}
