"use client";

import { useTransition } from "react";
import { updateRsvpStatus } from "@/app/admin/events/actions";
import type { RsvpStatus } from "@/lib/events";

const STATUS_OPTIONS: RsvpStatus[] = ["confirmed", "waitlisted", "cancelled"];

const STATUS_STYLES: Record<RsvpStatus, string> = {
  confirmed: "border-secondary text-secondary",
  waitlisted: "border-harvest-gold text-primary",
  cancelled: "border-outline text-on-surface-variant",
};

export function RsvpStatusSelect({
  id,
  eventId,
  status,
  name,
}: {
  id: string;
  eventId: string;
  status: RsvpStatus;
  name: string;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <select
      value={status}
      disabled={isPending}
      aria-label={`RSVP status for ${name}`}
      onChange={(e) => {
        const next = e.target.value as RsvpStatus;
        startTransition(() => {
          updateRsvpStatus(id, eventId, next);
        });
      }}
      className={`rounded-sm border bg-surface px-2 py-1 text-sm font-medium capitalize focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50 ${STATUS_STYLES[status]}`}
    >
      {STATUS_OPTIONS.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}
