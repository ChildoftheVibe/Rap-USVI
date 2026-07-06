import type { SupabaseClient } from "@supabase/supabase-js";
import { site } from "@/lib/content";
import { formatEventDateRange } from "@/lib/events";
import type { EventRow } from "@/lib/events";
import { BRAND, escapeHtml, getResendClient, renderEmailShell, renderField } from "@/lib/email";

function cancelUrl(cancelToken: string): string {
  return `${site.url}/events/cancel?token=${cancelToken}`;
}

function eventDetailsTable(event: EventRow): string {
  const location = [event.location_name, event.location_address].filter(Boolean).join(", ");
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%; margin-bottom:20px;">
      ${renderField("Event", escapeHtml(event.title))}
      ${renderField("When", escapeHtml(formatEventDateRange(event.start_at, event.end_at)))}
      ${location ? renderField("Where", escapeHtml(location)) : ""}
    </table>`;
}

interface RsvpEmailParams {
  event: EventRow;
  fullName: string;
  email: string;
  guestCount: number;
  cancelToken: string;
}

export async function sendRsvpConfirmationEmail(params: RsvpEmailParams): Promise<void> {
  const resend = getResendClient();
  const from = process.env.RESEND_FROM_EMAIL;
  if (!resend || !from) {
    throw new Error("Resend is not fully configured (RESEND_API_KEY / RESEND_FROM_EMAIL)");
  }

  const guestLine =
    params.guestCount > 0
      ? `<p>Your RSVP includes <strong>${params.guestCount} additional guest${params.guestCount === 1 ? "" : "s"}</strong>.</p>`
      : "";

  const body = `
    <div style="display:inline-block; background-color:${BRAND.gold}; color:${BRAND.primary}; font-size:12px; font-weight:bold; text-transform:uppercase; letter-spacing:0.04em; padding:4px 12px; border-radius:999px; margin-bottom:16px;">
      You're confirmed
    </div>
    <p style="margin-top:0;">Hi ${escapeHtml(params.fullName)},</p>
    <p>You're confirmed for the event below. We look forward to seeing you there.</p>
    ${eventDetailsTable(params.event)}
    ${guestLine}
    <p style="font-size:13px; color:${BRAND.inkVariant};">
      Plans changed? <a href="${cancelUrl(params.cancelToken)}" style="color:${BRAND.primary};">Cancel your RSVP</a>.
    </p>`;

  await resend.emails.send({
    from,
    to: params.email,
    subject: `You're confirmed: ${params.event.title}`,
    html: renderEmailShell(body),
  });
}

export async function sendRsvpWaitlistEmail(params: RsvpEmailParams): Promise<void> {
  const resend = getResendClient();
  const from = process.env.RESEND_FROM_EMAIL;
  if (!resend || !from) {
    throw new Error("Resend is not fully configured (RESEND_API_KEY / RESEND_FROM_EMAIL)");
  }

  const body = `
    <div style="display:inline-block; background-color:${BRAND.surface}; color:${BRAND.inkVariant}; font-size:12px; font-weight:bold; text-transform:uppercase; letter-spacing:0.04em; padding:4px 12px; border-radius:999px; margin-bottom:16px; border:1px solid ${BRAND.outline};">
      You're on the waitlist
    </div>
    <p style="margin-top:0;">Hi ${escapeHtml(params.fullName)},</p>
    <p>This event has reached capacity, so you've been added to the waitlist. If a spot opens up, we'll automatically confirm your RSVP and email you right away.</p>
    ${eventDetailsTable(params.event)}
    <p style="font-size:13px; color:${BRAND.inkVariant};">
      No longer able to attend? <a href="${cancelUrl(params.cancelToken)}" style="color:${BRAND.primary};">Remove yourself from the waitlist</a>.
    </p>`;

  await resend.emails.send({
    from,
    to: params.email,
    subject: `You're on the waitlist: ${params.event.title}`,
    html: renderEmailShell(body),
  });
}

export async function sendRsvpPromotedEmail(params: RsvpEmailParams): Promise<void> {
  const resend = getResendClient();
  const from = process.env.RESEND_FROM_EMAIL;
  if (!resend || !from) {
    throw new Error("Resend is not fully configured (RESEND_API_KEY / RESEND_FROM_EMAIL)");
  }

  const body = `
    <div style="display:inline-block; background-color:${BRAND.gold}; color:${BRAND.primary}; font-size:12px; font-weight:bold; text-transform:uppercase; letter-spacing:0.04em; padding:4px 12px; border-radius:999px; margin-bottom:16px;">
      A spot opened up
    </div>
    <p style="margin-top:0;">Hi ${escapeHtml(params.fullName)},</p>
    <p>Good news — a spot opened up and you're now <strong>confirmed</strong> for the event below.</p>
    ${eventDetailsTable(params.event)}
    <p style="font-size:13px; color:${BRAND.inkVariant};">
      Plans changed? <a href="${cancelUrl(params.cancelToken)}" style="color:${BRAND.primary};">Cancel your RSVP</a>.
    </p>`;

  await resend.emails.send({
    from,
    to: params.email,
    subject: `You're confirmed (spot opened up): ${params.event.title}`,
    html: renderEmailShell(body),
  });
}

export async function sendRsvpCancellationEmail(params: RsvpEmailParams): Promise<void> {
  const resend = getResendClient();
  const from = process.env.RESEND_FROM_EMAIL;
  if (!resend || !from) {
    throw new Error("Resend is not fully configured (RESEND_API_KEY / RESEND_FROM_EMAIL)");
  }

  const body = `
    <p style="margin-top:0;">Hi ${escapeHtml(params.fullName)},</p>
    <p>Your RSVP for <strong>${escapeHtml(params.event.title)}</strong> has been cancelled. We hope to see you at a future event.</p>`;

  await resend.emails.send({
    from,
    to: params.email,
    subject: `RSVP cancelled: ${params.event.title}`,
    html: renderEmailShell(body),
  });
}

/**
 * The `fn_promote_waitlist` DB trigger promotes waitlisted RSVPs atomically
 * when a spot frees up, but a trigger can't send email — it just stamps
 * `promoted_at`. Callers that cause a cancellation (the public cancel action
 * and the admin RSVP-status action) call this afterward to notify anyone the
 * trigger just promoted and mark them notified.
 */
export async function resolvePendingWaitlistPromotions(
  supabase: SupabaseClient,
  eventId: string
): Promise<void> {
  const { data: event } = await supabase.from("events").select("*").eq("id", eventId).maybeSingle();
  if (!event) return;

  const { data: promoted } = await supabase
    .from("event_rsvps")
    .select("*")
    .eq("event_id", eventId)
    .not("promoted_at", "is", null)
    .is("notified_at", null);

  for (const rsvp of promoted ?? []) {
    try {
      await sendRsvpPromotedEmail({
        event: event as EventRow,
        fullName: rsvp.full_name,
        email: rsvp.email,
        guestCount: rsvp.guest_count,
        cancelToken: rsvp.cancel_token,
      });
      await supabase.from("event_rsvps").update({ notified_at: new Date().toISOString() }).eq("id", rsvp.id);
    } catch (err) {
      await supabase.from("event_rsvps").update({ notify_error: String(err) }).eq("id", rsvp.id);
    }
  }
}
