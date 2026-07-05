"use client";

import { downloadPrayerEventIcs } from "@/lib/ics";

export function AddToCalendarButton() {
  return (
    <button
      type="button"
      onClick={downloadPrayerEventIcs}
      className="rounded-lg border-2 border-primary px-10 py-4 font-medium text-primary transition-all hover:bg-primary hover:text-white"
    >
      Add to Calendar
    </button>
  );
}
