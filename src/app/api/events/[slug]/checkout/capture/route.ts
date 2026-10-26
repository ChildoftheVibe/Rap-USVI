import { NextResponse } from "next/server";
import { eventCaptureSchema } from "@/lib/validation/checkout";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { capturePayPalOrder } from "@/lib/paypal";
import type { DonationRow } from "@/lib/donations";
import type { EventRow } from "@/lib/events";
import {
  SEAT_CLAIM_ERRORS,
  claimTicketSeats,
  completeEventPayment,
  findSponsorTier,
  isSponsorTierSoldOut,
  releaseTicketSeats,
} from "@/lib/eventCheckout";

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

/**
 * Finishes a ticket or sponsorship checkout. Order of operations matters:
 * seats are held in the database first, and only then is the money taken,
 * so a buyer is never charged for a seat that doesn't exist. If PayPal
 * refuses the payment, the seats go straight back on sale.
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

  if (row.purpose === "ticket") {
    const { errorCode } = await claimTicketSeats(supabase, row.id);
    if (errorCode) {
      const known = SEAT_CLAIM_ERRORS[errorCode];
      if (!known) console.error("Failed to hold ticket seats", { paymentId: row.id, errorCode });
      await supabase.from("donations").update({ status: "failed" }).eq("id", row.id).eq("status", "pending");
      return NextResponse.json(
        { error: known?.message ?? "We couldn't hold your seats. You have not been charged." },
        { status: known?.status ?? 500 }
      );
    }
  } else {
    const tier = row.sponsor_tier_key ? findSponsorTier(event, row.sponsor_tier_key) : undefined;
    if (tier && (await isSponsorTierSoldOut(supabase, event.id, tier))) {
      await supabase.from("donations").update({ status: "failed" }).eq("id", row.id).eq("status", "pending");
      return NextResponse.json(
        { error: `The ${tier.name} level just filled up. You have not been charged.` },
        { status: 409 }
      );
    }
  }

  let capture;
  try {
    capture = await capturePayPalOrder(orderId);
  } catch (err) {
    // Give the seats back either way. If the buyer retries with another card,
    // the next capture call simply holds them again.
    if (row.purpose === "ticket") await releaseTicketSeats(supabase, row.id);

    const issue = (err as { issue?: string }).issue;
    if (issue === "INSTRUMENT_DECLINED") {
      return NextResponse.json({ error: "INSTRUMENT_DECLINED" }, { status: 409 });
    }
    console.error("Failed to capture PayPal order for event payment", err);
    await supabase.from("donations").update({ status: "failed" }).eq("id", row.id).eq("status", "pending");
    return NextResponse.json({ error: "Payment could not be completed. You have not been charged." }, { status: 502 });
  }

  const paymentCapture = capture.purchase_units[0]?.payments?.captures?.[0];
  const capturedCents = paymentCapture ? Math.round(parseFloat(paymentCapture.amount.value) * 100) : null;

  if (!paymentCapture || paymentCapture.status !== "COMPLETED" || capturedCents !== row.amount_cents) {
    // PayPal may have taken money here, so keep any seats held and flag it for staff.
    console.error("PayPal capture amount/status mismatch for event payment", { paymentId: row.id, capture });
    await supabase
      .from("donations")
      .update({
        status: "failed",
        attention: "PayPal capture did not match the expected amount or status. Check this payment in PayPal.",
      })
      .eq("id", row.id);
    return NextResponse.json(
      { error: "We couldn't confirm your payment. Our team has been alerted and will contact you." },
      { status: 500 }
    );
  }

  const { data: freshRow } = await supabase.from("donations").select("*").eq("id", row.id).single();

  const finalRow = await completeEventPayment(supabase, (freshRow ?? row) as DonationRow, event, {
    captureId: paymentCapture.id,
    payerId: capture.payer?.payer_id ?? null,
    payerEmail: capture.payer?.email_address ?? null,
    payerName: capture.payer?.name
      ? [capture.payer.name.given_name, capture.payer.name.surname].filter(Boolean).join(" ")
      : null,
  });

  return NextResponse.json(successBody(finalRow));
}
