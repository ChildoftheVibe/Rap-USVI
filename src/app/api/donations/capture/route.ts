import { NextResponse } from "next/server";
import { donationCaptureSchema } from "@/lib/validation/donation";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { capturePayPalOrder } from "@/lib/paypal";
import { sendDonationReceiptEmail } from "@/lib/donationEmail";
import type { DonationRow } from "@/lib/donations";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = donationCaptureSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const supabase = createServiceRoleClient();

  const { data: donation, error: fetchError } = await supabase
    .from("donations")
    .select("*")
    .eq("paypal_order_id", parsed.data.orderId)
    .maybeSingle();

  if (fetchError || !donation) {
    return NextResponse.json({ error: "Donation not found" }, { status: 404 });
  }

  const row = donation as DonationRow;

  // Idempotent: a double-click, or a capture racing the reconciliation
  // webhook, should both land here safely.
  if (row.status === "completed") {
    return NextResponse.json({ success: true, amountCents: row.amount_cents, receiptEmail: row.donor_email });
  }

  let capture;
  try {
    capture = await capturePayPalOrder(parsed.data.orderId);
  } catch (err) {
    const issue = (err as { issue?: string }).issue;
    if (issue === "INSTRUMENT_DECLINED") {
      return NextResponse.json({ error: "INSTRUMENT_DECLINED" }, { status: 409 });
    }
    console.error("Failed to capture PayPal order", err);
    await supabase.from("donations").update({ status: "failed" }).eq("id", row.id);
    return NextResponse.json({ error: "Payment could not be completed" }, { status: 502 });
  }

  const paymentCapture = capture.purchase_units[0]?.payments?.captures?.[0];
  const capturedCents = paymentCapture ? Math.round(parseFloat(paymentCapture.amount.value) * 100) : null;

  if (!paymentCapture || paymentCapture.status !== "COMPLETED" || capturedCents !== row.amount_cents) {
    console.error("PayPal capture amount/status mismatch", { donationId: row.id, capture });
    await supabase.from("donations").update({ status: "failed" }).eq("id", row.id);
    return NextResponse.json({ error: "Payment verification failed" }, { status: 500 });
  }

  const completedAt = new Date().toISOString();
  const payerEmail = capture.payer?.email_address ?? null;
  const payerName = capture.payer?.name
    ? [capture.payer.name.given_name, capture.payer.name.surname].filter(Boolean).join(" ")
    : null;

  const { data: updated } = await supabase
    .from("donations")
    .update({
      status: "completed",
      paypal_capture_id: paymentCapture.id,
      payer_id: capture.payer?.payer_id ?? null,
      payer_email: payerEmail,
      payer_name: payerName,
      completed_at: completedAt,
    })
    .eq("id", row.id)
    .eq("status", "pending")
    .select("*")
    .maybeSingle();

  const finalRow = (updated as DonationRow) ?? { ...row, status: "completed" as const, completed_at: completedAt };
  const receiptEmail = finalRow.donor_email || payerEmail;

  if (receiptEmail) {
    try {
      await sendDonationReceiptEmail({
        email: receiptEmail,
        donorName: finalRow.donor_name || payerName || "Friend",
        amountCents: finalRow.amount_cents,
        dedication: finalRow.dedication,
        captureId: paymentCapture.id,
        completedAt,
      });
      await supabase.from("donations").update({ receipt_sent_at: new Date().toISOString() }).eq("id", row.id);
    } catch (emailError) {
      console.error("Donation captured but receipt email failed", emailError);
      await supabase.from("donations").update({ receipt_error: String(emailError) }).eq("id", row.id);
    }
  }

  return NextResponse.json({ success: true, amountCents: finalRow.amount_cents, receiptEmail });
}
