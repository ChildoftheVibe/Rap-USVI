import { NextResponse } from "next/server";
import { rsvpSchema } from "@/lib/validation/rsvp";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { isRateLimited } from "@/lib/ratelimit";
import { getClientIp, hashIp, isHoneypotTripped } from "@/lib/requestMeta";
import { sendRsvpConfirmationEmail, sendRsvpWaitlistEmail } from "@/lib/eventEmail";
import type { EventRow, EventRsvpRow } from "@/lib/events";

const RPC_ERROR_MESSAGES: Record<string, { status: number; message: string }> = {
  event_not_found: { status: 404, message: "This event could not be found." },
  event_not_open: { status: 404, message: "This event is not open for RSVPs." },
  rsvp_disabled: { status: 400, message: "RSVPs are closed for this event." },
  event_ended: { status: 400, message: "This event has already ended." },
  event_full: { status: 409, message: "This event is at full capacity." },
};

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  // Honeypot: silently accept-and-drop so bots don't learn they were caught.
  if (isHoneypotTripped(body)) {
    return NextResponse.json({ success: true, status: "confirmed" });
  }

  const parsed = rsvpSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }
  const input = parsed.data;

  const supabase = createServiceRoleClient();

  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (eventError || !event) {
    return NextResponse.json({ error: "This event could not be found." }, { status: 404 });
  }

  const ip = getClientIp(request);
  const ipHash = hashIp(ip);

  const limited = await isRateLimited(supabase, ipHash, "event_rsvps");
  if (limited) {
    return NextResponse.json({ error: "Too many submissions, please try again later" }, { status: 429 });
  }

  const turnstileOk = await verifyTurnstileToken(input.turnstileToken, ip);
  if (!turnstileOk) {
    return NextResponse.json({ error: "Verification failed" }, { status: 403 });
  }

  // rsvp_for_event() locks the event row and re-checks status/capacity itself
  // (see migration) so concurrent submissions near capacity can't both slip
  // through — this call is the single source of truth for confirmed vs.
  // waitlisted vs. rejected, not just a convenience wrapper around an insert.
  const { data: rsvp, error: rpcError } = await supabase.rpc("rsvp_for_event", {
    p_event_id: event.id,
    p_full_name: input.fullName,
    p_email: input.email,
    p_phone: input.phone || null,
    p_guest_count: input.guestCount,
    p_ip_hash: ipHash,
    p_user_agent: request.headers.get("user-agent"),
    p_turnstile_verified: true,
    p_source_page: `events/${slug}`,
  });

  if (rpcError || !rsvp) {
    const known = rpcError ? RPC_ERROR_MESSAGES[rpcError.message] : undefined;
    if (known) {
      return NextResponse.json({ error: known.message }, { status: known.status });
    }
    console.error("Failed to record RSVP", rpcError);
    return NextResponse.json({ error: "Something went wrong, please try again" }, { status: 500 });
  }

  const row = rsvp as EventRsvpRow;

  try {
    const emailParams = {
      event: event as EventRow,
      fullName: row.full_name,
      email: row.email,
      guestCount: row.guest_count,
      cancelToken: row.cancel_token,
    };
    if (row.status === "confirmed") {
      await sendRsvpConfirmationEmail(emailParams);
    } else if (row.status === "waitlisted") {
      await sendRsvpWaitlistEmail(emailParams);
    }
    await supabase.from("event_rsvps").update({ notified_at: new Date().toISOString() }).eq("id", row.id);
  } catch (emailError) {
    console.error("RSVP saved but notification email failed", emailError);
    await supabase.from("event_rsvps").update({ notify_error: String(emailError) }).eq("id", row.id);
    // The RSVP itself succeeded — don't surface an error to the user.
  }

  return NextResponse.json({ success: true, status: row.status });
}
