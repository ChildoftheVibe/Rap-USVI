import { NextResponse } from "next/server";
import { eventCaptureSchema } from "@/lib/validation/checkout";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { capturePayPalOrder, getPayPalOrder, type PayPalOrderDetails } from "@/lib/paypal";
import type { DonationRow } from "@/lib/donations";
import type { EventRow } from "@/lib/events";
import {
  SEAT_CLAIM_ERRORS,
  claimCheckoutHold,
  firstCapture,
  flagPaymentForStaff,
  isDefiniteRefusal,
  releaseCheckoutHold,
  settleCapture,
  type CaptureLike,
} from "@/lib/eventCheckout";

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
 * stays, staff are alerted, and the PayPal webhook or the stale-hold sweep
 * (settleStaleHolds) finishes the job.
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
  if (
    !orderAmount ||
    orderAmount.currency_code !== row.currency ||
    Math.round(parseFloat(orderAmount.value) * 100) !== row.amount_cents
  ) {
    console.error("PayPal order amount does not match the saved payment", { paymentId: row.id, orderAmount });
    await markFailed(supabase, row.id);
    return NextResponse.json({ error: "Payment verification failed. You have not been charged." }, { status: 400 });
  }

  // Already captured (for example, our earlier response got lost): just finish up.
  if (order.status === "COMPLETED") {
    return respond(await settleCapture(supabase, row, event, order, firstCapture(order)));
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
    if ((err as { issue?: string }).issue === "INSTRUMENT_DECLINED") {
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
      return respond(await settleCapture(supabase, row, event, after, firstCapture(after)));
    }

    if (after && isDefiniteRefusal(err)) {
      console.error("PayPal refused the capture", { paymentId: row.id, err });
      await releaseCheckoutHold(supabase, row.id);
      await markFailed(supabase, row.id);
      return NextResponse.json({ error: "Payment could not be completed. You have not been charged." }, { status: 402 });
    }

    console.error("PayPal capture outcome unknown; holding seats", { paymentId: row.id, err });
    await flagPaymentForStaff(
      supabase,
      row,
      event,
      "PayPal didn't confirm this capture in time. Seats are held. The site will recheck with PayPal automatically within the hour."
    );
    return NextResponse.json({ processing: true, message: PROCESSING_MESSAGE }, { status: 202 });
  }

  const capture: CaptureLike | undefined = firstCapture(captureResult);
  return respond(await settleCapture(supabase, row, event, captureResult, capture));
}

function respond(outcome: Awaited<ReturnType<typeof settleCapture>>) {
  switch (outcome.kind) {
    case "completed":
      return NextResponse.json(successBody(outcome.row));
    case "processing":
      return NextResponse.json({ processing: true, message: PROCESSING_MESSAGE }, { status: 202 });
    case "refused":
      return NextResponse.json({ error: "Payment could not be completed. You have not been charged." }, { status: 402 });
    case "mismatch":
      return NextResponse.json(
        { error: "We couldn't confirm your payment. Our team has been alerted and will contact you." },
        { status: 500 }
      );
  }
}
