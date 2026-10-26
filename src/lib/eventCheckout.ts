import type { SupabaseClient } from "@supabase/supabase-js";
import type { DonationRow } from "@/lib/donations";
import type { EventRow, EventRsvpRow } from "@/lib/events";
import type { SponsorTier } from "@/lib/validation/event";
import {
  notifyStaffOfEventPayment,
  sendSponsorshipReceiptEmail,
  sendTicketConfirmationEmail,
} from "@/lib/checkoutEmail";

/** Messages for the exceptions raised by the claim_ticket_seats() database function. */
export const SEAT_CLAIM_ERRORS: Record<string, { status: number; message: string }> = {
  sold_out: { status: 409, message: "Sorry, those seats just sold out. You have not been charged." },
  party_too_large: {
    status: 400,
    message: "That's more seats than one email can hold. Please use a different email for the extra seats.",
  },
  event_ended: { status: 400, message: "This event has already ended. You have not been charged." },
  event_not_open: { status: 400, message: "Ticket sales are closed for this event. You have not been charged." },
  rsvp_disabled: { status: 400, message: "Ticket sales are closed for this event. You have not been charged." },
  event_not_found: { status: 404, message: "This event could not be found. You have not been charged." },
};

export function isEventEnded(event: Pick<EventRow, "end_at">): boolean {
  return new Date(event.end_at) < new Date();
}

export function findSponsorTier(event: Pick<EventRow, "sponsor_tiers">, key: string): SponsorTier | undefined {
  return (event.sponsor_tiers ?? []).find((tier) => tier.key === key);
}

/** Completed sponsorships per tier key for one event. Used for the "2 of 3 left" counts and the sold out check. */
export async function getSponsorTierSales(supabase: SupabaseClient, eventId: string): Promise<Record<string, number>> {
  const { data } = await supabase
    .from("donations")
    .select("sponsor_tier_key")
    .eq("event_id", eventId)
    .eq("purpose", "sponsorship")
    .eq("status", "completed");

  const sales: Record<string, number> = {};
  for (const row of data ?? []) {
    if (row.sponsor_tier_key) sales[row.sponsor_tier_key] = (sales[row.sponsor_tier_key] ?? 0) + 1;
  }
  return sales;
}

export async function isSponsorTierSoldOut(
  supabase: SupabaseClient,
  eventId: string,
  tier: SponsorTier
): Promise<boolean> {
  if (tier.limit === null) return false;
  const sales = await getSponsorTierSales(supabase, eventId);
  return (sales[tier.key] ?? 0) >= tier.limit;
}

interface CaptureDetails {
  captureId: string;
  payerId: string | null;
  payerEmail: string | null;
  payerName: string | null;
}

/**
 * Marks a ticket or sponsorship payment completed and sends the buyer and
 * staff emails. Shared by the capture route (the normal path) and the PayPal
 * webhook (the backup path), and safe to call twice: only the call that flips
 * the row from pending to completed sends email.
 */
export async function completeEventPayment(
  supabase: SupabaseClient,
  row: DonationRow,
  event: EventRow,
  capture: CaptureDetails,
  attention: string | null = null
): Promise<DonationRow> {
  const completedAt = new Date().toISOString();

  const { data: updated } = await supabase
    .from("donations")
    .update({
      status: "completed",
      paypal_capture_id: capture.captureId,
      payer_id: capture.payerId,
      payer_email: capture.payerEmail,
      payer_name: capture.payerName,
      completed_at: completedAt,
      attention,
    })
    .eq("id", row.id)
    .eq("status", "pending")
    .select("*")
    .maybeSingle();

  if (!updated) {
    // Someone else (the other completion path) already finished this payment.
    return row;
  }

  const finalRow = updated as DonationRow;
  const email = finalRow.donor_email || capture.payerEmail;
  const name = finalRow.donor_name || capture.payerName || "Friend";

  if (email) {
    try {
      if (finalRow.purpose === "ticket") {
        if (finalRow.seats_claimed_at) {
          await sendTicketConfirmationEmail({
            event,
            fullName: name,
            email,
            quantity: finalRow.quantity ?? 1,
            amountCents: finalRow.amount_cents,
            captureId: capture.captureId,
            completedAt,
          });
          if (finalRow.rsvp_id) {
            await supabase
              .from("event_rsvps")
              .update({ notified_at: new Date().toISOString() })
              .eq("id", finalRow.rsvp_id);
          }
        }
      } else if (finalRow.purpose === "sponsorship") {
        await sendSponsorshipReceiptEmail({
          event,
          contactName: name,
          organization: finalRow.organization,
          email,
          tierName: finalRow.sponsor_tier_name ?? "Sponsor",
          amountCents: finalRow.amount_cents,
          captureId: capture.captureId,
          completedAt,
        });
      }
      await supabase.from("donations").update({ receipt_sent_at: new Date().toISOString() }).eq("id", row.id);
    } catch (emailError) {
      console.error("Event payment completed but buyer email failed", emailError);
      await supabase.from("donations").update({ receipt_error: String(emailError) }).eq("id", row.id);
    }
  }

  try {
    await notifyStaffOfEventPayment({
      event,
      kind: finalRow.purpose === "ticket" ? "ticket" : "sponsorship",
      name,
      email: email ?? "No email on file",
      organization: finalRow.organization,
      tierName: finalRow.sponsor_tier_name,
      quantity: finalRow.quantity,
      amountCents: finalRow.amount_cents,
      captureId: capture.captureId,
      attention,
    });
  } catch (err) {
    console.error("Event payment completed but staff notification failed", err);
  }

  return finalRow;
}

/** Calls claim_ticket_seats(); returns the RSVP or the database's error code. */
export async function claimTicketSeats(
  supabase: SupabaseClient,
  paymentId: string
): Promise<{ rsvp: EventRsvpRow | null; errorCode: string | null }> {
  const { data, error } = await supabase.rpc("claim_ticket_seats", { p_payment_id: paymentId });
  if (error || !data) {
    return { rsvp: null, errorCode: error?.message ?? "unknown" };
  }
  return { rsvp: data as EventRsvpRow, errorCode: null };
}

export async function releaseTicketSeats(supabase: SupabaseClient, paymentId: string): Promise<void> {
  const { error } = await supabase.rpc("release_ticket_seats", { p_payment_id: paymentId });
  if (error) console.error("Failed to release ticket seats", { paymentId, error });
}
