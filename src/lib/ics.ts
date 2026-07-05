import { event } from "@/lib/content";

function toIcsUtc(iso: string): string {
  return (
    new Date(iso)
      .toISOString()
      .replace(/[-:]/g, "")
      .split(".")[0] + "Z"
  );
}

/** Builds a minimal, valid .ics file for the Point Udall community prayer event. */
export function buildPrayerEventIcs(): string {
  const now = toIcsUtc(new Date().toISOString());
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Restore America's Paradise//rap-usvi.org//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:pray-over-usvi-2026@rap-usvi.org`,
    `DTSTAMP:${now}`,
    `DTSTART:${toIcsUtc(event.startIso)}`,
    `DTEND:${toIcsUtc(event.endIso)}`,
    `SUMMARY:${event.name}`,
    `DESCRIPTION:${event.description.replace(/\n/g, "\\n")}`,
    `LOCATION:${event.location}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.join("\r\n");
}

export function downloadPrayerEventIcs(): void {
  const blob = new Blob([buildPrayerEventIcs()], {
    type: "text/calendar;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "pray-over-usvi-2026.ics";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
