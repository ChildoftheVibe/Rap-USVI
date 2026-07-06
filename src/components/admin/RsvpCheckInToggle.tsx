"use client";

import { useTransition } from "react";
import { toggleRsvpCheckIn } from "@/app/admin/events/actions";

export function RsvpCheckInToggle({
  id,
  eventId,
  checkedIn,
  name,
}: {
  id: string;
  eventId: string;
  checkedIn: boolean;
  name: string;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      aria-pressed={checkedIn}
      aria-label={`Toggle check-in for ${name}`}
      onClick={() => startTransition(() => toggleRsvpCheckIn(id, eventId, !checkedIn))}
      className={`rounded-sm border px-2 py-1 text-xs font-medium transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
        checkedIn
          ? "border-secondary bg-secondary text-white"
          : "border-outline-variant text-on-surface-variant hover:border-primary"
      }`}
    >
      {checkedIn ? "Checked in" : "Check in"}
    </button>
  );
}
