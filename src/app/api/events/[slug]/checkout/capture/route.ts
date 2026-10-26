import { NextResponse } from "next/server";
import { eventCaptureSchema } from "@/lib/validation/checkout";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { capturePayPalOrder, getPayPalOrder, type PayPalOrderDetails } from "@/lib/paypal";
import type { DonationRow } from "@/lib/donations";
import type { EventRow } from "@/lib/events";
import {
  SEAT_CLAIM_ERRORS,
  claimCheckoutHold,
  completeEventPayment,
  flagPaymentForStaff,
  releaseCheckoutHold,
} from "@/lib/eventCheckout";

type CaptureLike = {
  id: string;
  status: string;
  amount: { value: string; currency_code: string };
};

const PROCESSING_MESSAGE =
  "PayPal is still finishing your payment. You'll get a confirmation email as soon as it clears. Please don't pay again.";

function successBody(row: DonationRow) {
  return {
    success: true,
    kind: row.purpose,
    amountCents: row.amount_cents,
    quantity: row.quantity,
    tierName: row.sponsor_tier_name,
    email: row.donor_email,
  };
}

function toCents(value: string): number {
  return Math.round(parseFloat(value) * 100);
}

function firstCapture(order: {
  purchase_units: { payments?: { captures?: CaptureLike[] } }[];
}): CaptureLike | undefined {
  return order.purchase_units[0]?.payments?.captures?.[0];
}

function payerOf(order: Pick<PayPalOrderDetails, "payer">) {
  return {
    payerId: order.payer?.payer_id ?? null,
    payerEmail: order.payer?.email_address ?? null,
    payerName: order.payer?.name
      ? [order.payer.name.given_name, order.payer.name.surname].filter(Boolean).join(" ")
      : null,
  };
}

async function markFailed(supabase: ReturnType<typeof createServiceRoleClient>, id: string) {
  await supabase.from("donations").update({ status: "failed" }).eq("id", id).eq("status", "pending");
}

/**
 * Finishes a ticket or sponsorship checkout.
 *
 * Order of operations is what keeps this safe:
 *  1. Ask PayPal whether the buyer really approved this order (and for the right amount).
 *  2. Hold the seats or sponsor slot in the database, under a lock.
 *  3. Take the money.
 * Holds are only given back when PayPal definitely did not take the money.
 * When the result is unclear (a timeout, a payment under review), the hold
 * stays, staff are alerted, and the PayPal webhook finishes the job.
 */
export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = eventCaptureSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const { orderId } = parsed.data;

  const supabase = createServiceRoleClient();

  const { data: payment } = await supabase
    .from("donations")
    .select("*")
    .eq("paypal_order_id", orderId)
    .in("purpose", ["ticket", "sponsorship"])
    .maybeSingle();
  if (!payment) {
    return NextResponse.json({ error: "Checkout not found" }, { status: 404 });
  }
  const row = payment as DonationRow;

  const { data: eventData } = await supabase.from("events").select("*").eq("id", row.event_id).maybeSingle();
  const event = eventData as EventRow | null;
  if (!event || event.slug !== slug) {
    return NextResponse.json({ error: "Checkout not found" }, { status: 404 });
  }

  // Idempotent: a double click, or a capture racing the webhook, lands here safely.
  if (row.status === "completed") {
    return NextResponse.json(successBody(row));
  }
  if (row.status !== "pending") {
    return NextResponse.json(
      { error: "This checkout has expired. Please start again. You have not been charged." },
      { status: 409 }
    );
  }

  // Step 1: confirm with PayPal before touching seats.
  let order: PayPalOrderDetails;
  try {
    order = await getPayPalOrder(orderId);
  } catch (err) {
    console.error("Failed to read PayPal order", err);
    return NextResponse.json({ error: "We couldn't reach PayPal. Please try again." }, { status: 502 });
  }

  const orderAmount = order.purchase_units[0]?.amount;
  if (!orderAmount || orderAmount.currency_code !== row.currency || toCents(orderAmount.value) !== row.amount_cents) {
    console.error("PayPal order amount does not match the saved payment", { paymentId: row.id, orderAmount });
    await markFailed(supabase, row.id);
    return NextResponse.json({ error: "Payment verification failed. You have not been charged." }, { status: 400 });
  }

  // Already captured (for example, our earlier response got lost): just finish up.
  if (order.status === "COMPLETED") {
    return finishCaptured(supabase, row, event, order, firstCapture(order));
  }

  if (order.status !== "APPROVED") {
    return NextResponse.json(
      { error: "PayPal hasn't approved this payment yet. Please finish in the PayPal window. You have not been charged." },
      { status: 409 }
    );
  }

  // Step 2: hold the seats or sponsor slot.
  const { errorCode } = await claimCheckoutHold(supabase, row);
  if (errorCode) {
    const known = SEAT_CLAIM_ERRORS[errorCode];
    if (!known) console.error("Failed to hold checkout", { paymentId: row.id, errorCode });
    // checkout_in_progress means another order owns the hold right now; leave
    // this one pending so the buyer can retry once that one finishes.
    if (errorCode !== "checkout_in_progress") await markFailed(supabase, row.id);
    return NextResponse.json(
      { error: known?.message ?? "We couldn't hold your spot. You have not been charged." },
      { status: known?.status ?? 500 }
    );
  }

  // Step 3: take the money.
  let captureResult;
  try {
    captureResult = await capturePayPalOrder(orderId);
  } catch (err) {
    const { status, issue } = err as { status?: number; issue?: string };

    if (issue === "INSTRUMENT_DECLINED") {
      // The buyer picks another card and PayPal calls us again; the next call re-holds.
      await releaseCheckoutHold(supabase, row.id);
      return NextResponse.json({ error: "INSTRUMENT_DECLINED" }, { status: 409 });
    }

    // Unclear outcome. Ask PayPal what actually happened before deciding.
    let after: PayPalOrderDetails | null = null;
    try {
      after = await getPayPalOrder(orderId);
    } catch {
      after = null;
    }

    if (after?.status === "COMPLETED") {
      return finishCaptured(supabase, row, event, after, firstCapture(after));
    }

    const definitelyRefused = !!after && typeof status === "number" && status >= 400 && status < 500 && status !== 429;
    if (definitelyRefused) {
      console.error("PayPal refused the capture", { paymentId: row.id, status, issue });
      await releaseCheckoutHold(supabase, row.id);
      await markFailed(supabase, row.id);
      return NextResponse.json({ error: "Payment could not be completed. You have not been charged." }, { status: 402 });
    }

    console.error("PayPal capture outcome unknown; holding seats for the webhook", { paymentId: row.id, err });
    await flagPaymentForStaff(
      supabase,
      row,
      event,
      "PayPal didn't confirm this capture in time. Seats are held. The PayPal webhook should finish it; if it hasn't within an hour, check the order in PayPal."
    );
    return NextResponse.json({ processing: true, message: PROCESSING_MESSAGE }, { status: 202 });
  }

  return finishCaptured(supabase, row, event, captureResult, firstCapture(captureResult));
}

async function finishCaptured(
  supabase: ReturnType<typeof createServiceRoleClient>,
  row: DonationRow,
  event: EventRow,
  order: Pick<PayPalOrderDetails, "payer">,
  capture: CaptureLike | undefined
) {
  if (!capture || toCents(capture.amount.value) !== row.amount_cents) {
    console.error("PayPal capture amount mismatch for event payment", { paymentId: row.id, capture });
    await flagPaymentForStaff(
      supabase,
      row,
      event,
      "PayPal's captured amount didn't match the expected price. Seats are held. Check this payment in PayPal."
    );
    return NextResponse.json(
      { error: "We couldn't confirm your payment. Our team has been alerted and will contact you." },
      { status: 500 }
    );
  }

  if (capture.status === "PENDING") {
    // PayPal is reviewing the payment. Keep the hold; the webhook finishes it when it clears.
    await flagPaymentForStaff(
      supabase,
      row,
      event,
      "PayPal is holding this payment for review. Seats are held until it clears or is denied."
    );
    return NextResponse.json({ processing: true, message: PROCESSING_MESSAGE }, { status: 202 });
  }

  if (capture.status !== "COMPLETED") {
    // DECLINED or FAILED: no money moved.
    await releaseCheckoutHold(supabase, row.id);
    await markFailed(supabase, row.id);
    return NextResponse.json({ error: "Payment could not be completed. You have not been charged." }, { status: 402 });
  }

  // If the hold was never placed (the order was captured on an earlier call
  // that didn't finish), place it now. The money is in, so a failure here is
  // flagged for staff rather than refused.
  let attention: string | null = null;
  const { data: current } = await supabase.from("donations").select("*").eq("id", row.id).single();
  if (current && !(current as DonationRow).seats_claimed_at) {
    const { errorCode } = await claimCheckoutHold(supabase, current as DonationRow);
    if (errorCode) {
      attention = `Paid, but the ${row.purpose === "ticket" ? "seats" : "sponsor slot"} could not be held (${errorCode}). Contact the buyer or refund in PayPal.`;
    }
  }

  const { data: freshRow } = await supabase.from("donations").select("*").eq("id", row.id).single();
  const finalRow = await completeEventPayment(
    supabase,
    (freshRow ?? row) as DonationRow,
    event,
    { captureId: capture.id, ...payerOf(order) },
    attention
  );

  return NextResponse.json(successBody(finalRow));
}
