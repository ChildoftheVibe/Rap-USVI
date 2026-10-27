import type { SupabaseClient } from "@supabase/supabase-js";
import type { DonationRow } from "@/lib/donations";
import type { EventRow } from "@/lib/events";
import type { SponsorTier } from "@/lib/validation/event";
import { capturePayPalOrder, getPayPalOrder } from "@/lib/paypal";
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
  checkout_in_progress: {
    status: 409,
    message: "Another checkout for this email is still finishing. Please wait a minute and try again. You have not been charged.",
  },
  sponsor_sold_out: { status: 409, message: "That sponsor level just filled up. You have not been charged." },
  tier_not_found: { status: 400, message: "That sponsor level is no longer offered. You have not been charged." },
  payment_not_pending: { status: 409, message: "This checkout has expired. Please start again. You have not been charged." },
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
  // A note the database left while holding (for example, sponsor seats
  // skipped because the event is full) still needs a person after payment.
  const finalAttention = attention ?? row.hold_note ?? null;

  const { data: updated } = await supabase
    .from("donations")
    .update({
      status: "completed",
      paypal_capture_id: capture.captureId,
      payer_id: capture.payerId,
      payer_email: capture.payerEmail,
      payer_name: capture.payerName,
      completed_at: completedAt,
      attention: finalAttention,
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
        const seats = finalRow.rsvp_id ? (finalRow.quantity ?? 0) : 0;
        await sendSponsorshipReceiptEmail({
          event,
          contactName: name,
          organization: finalRow.organization,
          email,
          tierName: finalRow.sponsor_tier_name ?? "Sponsor",
          amountCents: finalRow.amount_cents,
          captureId: capture.captureId,
          completedAt,
          seats,
          seatValueCents: event.ticket_price_cents,
        });
        if (finalRow.rsvp_id) {
          await supabase
            .from("event_rsvps")
            .update({ notified_at: new Date().toISOString() })
            .eq("id", finalRow.rsvp_id);
        }
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
      attention: finalAttention,
    });
  } catch (err) {
    console.error("Event payment completed but staff notification failed", err);
  }

  return finalRow;
}

/**
 * Holds what the buyer is paying for, under a database lock: seats for a
 * ticket (claim_ticket_seats) or one slot of a limited sponsor level
 * (claim_sponsor_slot). Returns the database's error code if it can't.
 * Safe to call twice for the same payment.
 */
export async function claimCheckoutHold(
  supabase: SupabaseClient,
  row: Pick<DonationRow, "id" | "purpose">
): Promise<{ errorCode: string | null }> {
  const fn = row.purpose === "ticket" ? "claim_ticket_seats" : "claim_sponsor_slot";
  const { error } = await supabase.rpc(fn, { p_payment_id: row.id });
  return { errorCode: error ? error.message || "unknown" : null };
}

/** Gives seats or a sponsor slot back. Only call when PayPal definitely did not take the money. */
export async function releaseCheckoutHold(supabase: SupabaseClient, paymentId: string): Promise<void> {
  const { error } = await supabase.rpc("release_checkout_hold", { p_payment_id: paymentId });
  if (error) console.error("Failed to release checkout hold", { paymentId, error });
}

/** Flags a payment for staff and emails them, for cases a person needs to look at in PayPal. */
export async function flagPaymentForStaff(
  supabase: SupabaseClient,
  row: DonationRow,
  event: EventRow,
  attention: string
): Promise<void> {
  await supabase.from("donations").update({ attention }).eq("id", row.id);
  try {
    await notifyStaffOfEventPayment({
      event,
      kind: row.purpose === "ticket" ? "ticket" : "sponsorship",
      name: row.donor_name || "Unknown buyer",
      email: row.donor_email || "No email on file",
      organization: row.organization,
      tierName: row.sponsor_tier_name,
      quantity: row.quantity,
      amountCents: row.amount_cents,
      captureId: row.paypal_order_id ? `Order ${row.paypal_order_id}` : "Unknown",
      attention,
      subjectPrefix: "Check this payment",
    });
  } catch (err) {
    console.error("Failed to alert staff about payment", err);
  }
}

export interface CaptureLike {
  id: string;
  status: string;
  amount: { value: string; currency_code: string };
}

interface PayerLike {
  payer?: {
    payer_id?: string;
    email_address?: string;
    name?: { given_name?: string; surname?: string };
  };
}

export function firstCapture(order: {
  purchase_units: { payments?: { captures?: CaptureLike[] } }[];
}): CaptureLike | undefined {
  return order.purchase_units[0]?.payments?.captures?.[0];
}

function payerOf(order: PayerLike) {
  return {
    payerId: order.payer?.payer_id ?? null,
    payerEmail: order.payer?.email_address ?? null,
    payerName: order.payer?.name
      ? [order.payer.name.given_name, order.payer.name.surname].filter(Boolean).join(" ")
      : null,
  };
}

export type SettleOutcome =
  | { kind: "completed"; row: DonationRow }
  | { kind: "processing" }
  | { kind: "refused" }
  | { kind: "mismatch" };

/**
 * Decides what happens once PayPal has answered a capture: complete it, wait
 * on a payment under review, give the hold back after a refusal, or flag an
 * amount mismatch for staff. Shared by the capture route and the stale-hold sweep.
 */
export async function settleCapture(
  supabase: SupabaseClient,
  row: DonationRow,
  event: EventRow,
  order: PayerLike,
  capture: CaptureLike | undefined
): Promise<SettleOutcome> {
  const cents = capture ? Math.round(parseFloat(capture.amount.value) * 100) : null;
  if (!capture || cents !== row.amount_cents) {
    console.error("PayPal capture amount mismatch for event payment", { paymentId: row.id, capture });
    await flagPaymentForStaff(
      supabase,
      row,
      event,
      "PayPal's captured amount didn't match the expected price. Seats are held. Check this payment in PayPal."
    );
    return { kind: "mismatch" };
  }

  if (capture.status === "PENDING") {
    if (!row.attention) {
      await flagPaymentForStaff(
        supabase,
        row,
        event,
        "PayPal is holding this payment for review. Seats are held until it clears or is denied."
      );
    }
    return { kind: "processing" };
  }

  if (capture.status !== "COMPLETED") {
    await releaseCheckoutHold(supabase, row.id);
    await supabase.from("donations").update({ status: "failed" }).eq("id", row.id).eq("status", "pending");
    return { kind: "refused" };
  }

  // The money is in. If an overlapping request marked this row failed, undo that first.
  await supabase.from("donations").update({ status: "pending" }).eq("id", row.id).eq("status", "failed");

  let attention: string | null = null;
  const { data: current } = await supabase.from("donations").select("*").eq("id", row.id).single();
  if (current && !(current as DonationRow).seats_claimed_at) {
    const { errorCode } = await claimCheckoutHold(supabase, current as DonationRow);
    if (errorCode) {
      attention = `Paid, but the ${row.purpose === "ticket" ? "seats" : "sponsor slot"} could not be held (${errorCode}). Contact the buyer or refund in PayPal.`;
    }
  }

  const { data: fresh } = await supabase.from("donations").select("*").eq("id", row.id).single();
  const finalRow = await completeEventPayment(
    supabase,
    (fresh ?? current ?? row) as DonationRow,
    event,
    { captureId: capture.id, ...payerOf(order) },
    attention
  );
  return { kind: "completed", row: finalRow };
}

/**
 * PayPal errors that mean "this capture did not and will not happen". Duplicate
 * or in-progress answers (409, PREVIOUS_REQUEST_IN_PROGRESS) are not on this
 * list: another request may be capturing the same order right now.
 */
export function isDefiniteRefusal(err: unknown): boolean {
  const { status, issue } = (err ?? {}) as { status?: number; issue?: string };
  if (typeof status !== "number" || status < 400 || status >= 500) return false;
  if (status === 409 || status === 429) return false;
  if (issue === "PREVIOUS_REQUEST_IN_PROGRESS" || issue === "DUPLICATE_REQUEST_ID") return false;
  return true;
}

const STALE_HOLD_MINUTES = 60;

/**
 * Settles holds left behind when PayPal never gave a clear answer (a timeout
 * with no webhook afterward). Runs automatically when someone starts a
 * checkout for the event and when staff open its RSVP list, so held seats
 * can't stay stuck. Each stale row is checked with PayPal: finished if paid,
 * captured if still approved, released if the order is dead.
 */
export async function settleStaleHolds(supabase: SupabaseClient, eventId: string): Promise<void> {
  const cutoff = new Date(Date.now() - STALE_HOLD_MINUTES * 60_000).toISOString();

  const { data: rows } = await supabase
    .from("donations")
    .select("*")
    .eq("event_id", eventId)
    .in("purpose", ["ticket", "sponsorship"])
    .eq("status", "pending")
    .not("seats_claimed_at", "is", null)
    .not("paypal_order_id", "is", null)
    .lt("seats_claimed_at", cutoff)
    .order("seats_claimed_at", { ascending: true })
    .limit(5);
  if (!rows?.length) return;

  const { data: eventData } = await supabase.from("events").select("*").eq("id", eventId).maybeSingle();
  if (!eventData) return;
  const event = eventData as EventRow;

  for (const raw of rows) {
    const row = raw as DonationRow;
    try {
      let order;
      try {
        order = await getPayPalOrder(row.paypal_order_id!);
      } catch (err) {
        if ((err as { status?: number }).status === 404) {
          // PayPal deletes orders that were never paid after a while.
          await releaseCheckoutHold(supabase, row.id);
          await supabase.from("donations").update({ status: "failed" }).eq("id", row.id).eq("status", "pending");
        }
        continue;
      }

      if (order.status === "COMPLETED") {
        await settleCapture(supabase, row, event, order, firstCapture(order));
      } else if (order.status === "APPROVED") {
        try {
          const captured = await capturePayPalOrder(row.paypal_order_id!);
          await settleCapture(supabase, row, event, captured, firstCapture(captured));
        } catch (err) {
          if ((err as { issue?: string }).issue === "INSTRUMENT_DECLINED" || isDefiniteRefusal(err)) {
            await releaseCheckoutHold(supabase, row.id);
            await supabase.from("donations").update({ status: "failed" }).eq("id", row.id).eq("status", "pending");
          }
        }
      } else {
        // VOIDED, CREATED, PAYER_ACTION_REQUIRED: no money will move on this order.
        await releaseCheckoutHold(supabase, row.id);
        await supabase.from("donations").update({ status: "failed" }).eq("id", row.id).eq("status", "pending");
      }
    } catch (err) {
      console.error("Failed to settle stale checkout hold", { paymentId: row.id, err });
    }
  }
}
