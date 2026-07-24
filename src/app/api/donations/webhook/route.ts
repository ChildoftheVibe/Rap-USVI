import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { verifyPayPalWebhookSignature } from "@/lib/paypal";
import { sendDonationReceiptEmail } from "@/lib/donationEmail";
import type { DonationRow } from "@/lib/donations";

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

  switch (event.event_type) {
    case "PAYMENT.CAPTURE.COMPLETED": {
      if (row.status !== "pending") break;

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
