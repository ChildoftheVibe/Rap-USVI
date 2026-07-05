"use client";

import { downloadPrayerEventIcs } from "@/lib/ics";

export function AddToCalendarButton() {
  return (
    <button
      type="button"
      onClick={downloadPrayerEventIcs}
      className="btn btn-lg btn-outline w-full sm:w-max"
    >
      Add to Calendar
    </button>
  );
}
