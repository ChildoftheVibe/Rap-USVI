import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { verifyPayPalWebhookSignature } from "@/lib/paypal";
import { sendDonationReceiptEmail } from "@/lib/donationEmail";
import type { DonationRow } from "@/lib/donations";
import type { EventRow } from "@/lib/events";
import { claimCheckoutHold, completeEventPayment, releaseCheckoutHold } from "@/lib/eventCheckout";

interface PayPalCaptureResource {
  id: string;
  status: string;
  custom_id?: string;
  amount?: { value: string; currency_code: string };
  supplementary_data?: { related_ids?: { order_id?: string } };
  payer?: { email_address?: string; payer_id?: string; name?: { given_name?: string; surname?: string } };
}

interface PayPalWebhookEvent {
  event_type: string;
  resource: PayPalCaptureResource;
}

/**
 * Reconciliation only — src/app/api/donations/capture/route.ts is the
 * primary completion path. This catches missed captures, denials, and
 * refunds, and is written to be safely re-run (PayPal retries on non-2xx).
 */
export async function POST(request: Request) {
  let event: PayPalWebhookEvent;
  try {
    event = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const verified = await verifyPayPalWebhookSignature({ headers: request.headers, event });
  if (!verified) {
    console.error("PayPal webhook signature verification failed", event.event_type);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const resource = event.resource;
  const donationId = resource.custom_id;
  const orderId = resource.supplementary_data?.related_ids?.order_id;

  if (!donationId && !orderId) {
    return NextResponse.json({ success: true });
  }

  const supabase = createServiceRoleClient();
  let query = supabase.from("donations").select("*");
  query = donationId ? query.eq("id", donationId) : query.eq("paypal_order_id", orderId!);
  const { data: donation } = await query.maybeSingle();

  if (!donation) {
    return NextResponse.json({ success: true });
  }

  const row = donation as DonationRow;

  if (row.purpose === "ticket" || row.purpose === "sponsorship") {
    await handleEventPaymentWebhook(supabase, event, row);
    return NextResponse.json({ success: true });
  }

  switch (event.event_type) {
    case "PAYMENT.CAPTURE.COMPLETED": {
      if (row.status !== "pending") break;

      // Same check the primary capture path makes: never mark a donation
      // complete for an amount or currency that doesn't match what we recorded
      // when the order was created. The signature proves the event came from
      // PayPal; it doesn't prove it's for the amount we asked for.
      const capturedCents = resource.amount ? Math.round(parseFloat(resource.amount.value) * 100) : null;
      if (capturedCents !== row.amount_cents || resource.amount?.currency_code !== row.currency) {
        console.error("PayPal webhook capture amount/currency mismatch", {
          donationId: row.id,
          expectedCents: row.amount_cents,
          expectedCurrency: row.currency,
          received: resource.amount,
        });
        await supabase.from("donations").update({ status: "failed" }).eq("id", row.id).eq("status", "pending");
        break;
      }

      const completedAt = new Date().toISOString();
      const payerEmail = resource.payer?.email_address ?? null;
      const payerName = resource.payer?.name
        ? [resource.payer.name.given_name, resource.payer.name.surname].filter(Boolean).join(" ")
        : null;

      await supabase
        .from("donations")
        .update({
          status: "completed",
          paypal_capture_id: resource.id,
          payer_id: resource.payer?.payer_id ?? null,
          payer_email: payerEmail,
          payer_name: payerName,
          completed_at: completedAt,
        })
        .eq("id", row.id)
        .eq("status", "pending");

      const receiptEmail = row.donor_email || payerEmail;
      if (receiptEmail) {
        try {
          await sendDonationReceiptEmail({
            email: receiptEmail,
            donorName: row.donor_name || payerName || "Friend",
            amountCents: row.amount_cents,
            dedication: row.dedication,
            captureId: resource.id,
            completedAt,
          });
          await supabase.from("donations").update({ receipt_sent_at: new Date().toISOString() }).eq("id", row.id);
        } catch (emailError) {
          await supabase.from("donations").update({ receipt_error: String(emailError) }).eq("id", row.id);
        }
      }
      break;
    }
    case "PAYMENT.CAPTURE.DENIED": {
      if (row.status !== "completed") {
        await supabase.from("donations").update({ status: "failed" }).eq("id", row.id);
      }
      break;
    }
    case "PAYMENT.CAPTURE.REFUNDED": {
      await supabase
        .from("donations")
        .update({ status: "refunded", refunded_at: new Date().toISOString() })
        .eq("id", row.id);
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ success: true });
}

function payerDetails(resource: PayPalCaptureResource) {
  return {
    captureId: resource.id,
    payerId: resource.payer?.payer_id ?? null,
    payerEmail: resource.payer?.email_address ?? null,
    payerName: resource.payer?.name
      ? [resource.payer.name.given_name, resource.payer.name.surname].filter(Boolean).join(" ")
      : null,
  };
}

/**
 * Backup path for ticket and sponsorship payments. The capture route normally
 * finishes these; this catches the rare case where PayPal took the money but
 * our capture request never finished (a timeout or a closed browser tab).
 */
async function handleEventPaymentWebhook(
  supabase: ReturnType<typeof createServiceRoleClient>,
  event: PayPalWebhookEvent,
  row: DonationRow
) {
  const resource = event.resource;

  switch (event.event_type) {
    case "PAYMENT.CAPTURE.COMPLETED": {
      // Also accept rows our capture route marked failed: if PayPal says the
      // money moved, the buyer paid and must get their seats or a flag for staff.
      if (row.status === "completed" || row.status === "refunded" || !row.event_id) break;

      const capturedCents = resource.amount ? Math.round(parseFloat(resource.amount.value) * 100) : null;
      if (capturedCents !== row.amount_cents || resource.amount?.currency_code !== row.currency) {
        console.error("PayPal webhook capture amount/currency mismatch for event payment", {
          paymentId: row.id,
          expectedCents: row.amount_cents,
          received: resource.amount,
        });
        await supabase
          .from("donations")
          .update({
            status: "failed",
            attention: "PayPal reported a different amount than expected. Check this payment in PayPal.",
          })
          .eq("id", row.id)
          .neq("status", "completed");
        break;
      }

      const { data: eventRow } = await supabase.from("events").select("*").eq("id", row.event_id).maybeSingle();
      if (!eventRow) break;

      if (row.status === "failed") {
        await supabase.from("donations").update({ status: "pending" }).eq("id", row.id).eq("status", "failed");
      }

      let attention: string | null = null;
      if (!row.seats_claimed_at) {
        const { errorCode } = await claimCheckoutHold(supabase, row);
        if (errorCode) {
          attention = `Paid, but the ${row.purpose === "ticket" ? "seats" : "sponsor slot"} could not be held (${errorCode}). Contact the buyer or refund in PayPal.`;
        }
      }

      const { data: freshRow } = await supabase.from("donations").select("*").eq("id", row.id).single();
      await completeEventPayment(
        supabase,
        (freshRow ?? row) as DonationRow,
        eventRow as EventRow,
        payerDetails(resource),
        attention
      );
      break;
    }
    case "PAYMENT.CAPTURE.DENIED": {
      if (row.status !== "completed") {
        await releaseCheckoutHold(supabase, row.id);
        await supabase.from("donations").update({ status: "failed" }).eq("id", row.id);
      }
      break;
    }
    case "PAYMENT.CAPTURE.REFUNDED": {
      await supabase
        .from("donations")
        .update({
          status: "refunded",
          refunded_at: new Date().toISOString(),
          attention:
            row.purpose === "ticket"
              ? "Refunded in PayPal. Cancel this buyer's RSVP if the seats should go back on sale."
              : null,
        })
        .eq("id", row.id);
      break;
    }
    default:
      break;
  }
}
