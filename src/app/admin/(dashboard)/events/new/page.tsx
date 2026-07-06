import type { Metadata } from "next";
import { EventForm } from "@/components/admin/EventForm";

export const metadata: Metadata = {
  title: "New Event | Admin",
  robots: { index: false, follow: false },
};

export default function NewEventPage() {
  return (
    <div className="space-y-6">
      <h1 className="font-[family-name:var(--font-headline)] text-2xl text-on-surface">New Event</h1>
      <EventForm mode="new" />
    </div>
  );
}
