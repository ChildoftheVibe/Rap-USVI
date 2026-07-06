import type { Metadata } from "next";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { formatEventDateRange } from "@/lib/events";
import { CancelRsvpForm } from "@/components/forms/CancelRsvpForm";

export const metadata: Metadata = {
  title: "Cancel RSVP",
  robots: { index: false, follow: false },
};

// Token lookups must never be prerendered/cached, and this must never depend
// on Supabase being reachable at build time — same reasoning as the admin pages.
export const dynamic = "force-dynamic";

function StatusMessage({ title, body }: { title: string; body: string }) {
  return (
    <div className="mx-auto max-w-lg px-margin-mobile py-24 text-center md:px-margin-desktop">
      <h1 className="mb-4 font-[family-name:var(--font-headline)] text-2xl text-primary">{title}</h1>
      <p className="text-on-surface-variant">{body}</p>
    </div>
  );
}

export default async function CancelRsvpPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    return <StatusMessage title="Invalid link" body="This cancellation link is missing its token." />;
  }

  const supabase = createServiceRoleClient();
  const { data: rsvp } = await supabase
    .from("event_rsvps")
    .select("status, events(title, start_at, end_at)")
    .eq("cancel_token", token)
    .maybeSingle();

  if (!rsvp) {
    return <StatusMessage title="Link not found" body="This cancellation link is invalid or has expired." />;
  }

  if (rsvp.status === "cancelled") {
    return <StatusMessage title="Already cancelled" body="This RSVP has already been cancelled." />;
  }

  const event = Array.isArray(rsvp.events) ? rsvp.events[0] : rsvp.events;

  return (
    <div className="mx-auto max-w-lg px-margin-mobile py-24 text-center md:px-margin-desktop">
      <h1 className="mb-4 font-[family-name:var(--font-headline)] text-2xl text-primary">Cancel your RSVP</h1>
      {event && (
        <p className="mb-8 text-on-surface-variant">
          {event.title} — {formatEventDateRange(event.start_at, event.end_at)}
        </p>
      )}
      <CancelRsvpForm token={token} />
    </div>
  );
}
