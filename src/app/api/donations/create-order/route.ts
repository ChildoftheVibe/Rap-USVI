import { NextResponse } from "next/server";
import { donationCreateSchema } from "@/lib/validation/donation";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { isRateLimited } from "@/lib/ratelimit";
import { getClientIp, hashIp, isHoneypotTripped } from "@/lib/requestMeta";
import { createPayPalOrder } from "@/lib/paypal";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  // Unlike other forms, a tripped honeypot returns a real error instead of a
  // silent accept-and-drop: this route's only "success" output is a usable
  // PayPal order ID, and there's no fake one we can hand back that wouldn't
  // immediately break in the PayPal button UI anyway.
  if (isHoneypotTripped(body)) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const parsed = donationCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }
  const input = parsed.data;
  const amountCents = Math.round(input.amount * 100);

  const supabase = createServiceRoleClient();

  const ip = getClientIp(request);
  const ipHash = hashIp(ip);

  const limited = await isRateLimited(supabase, ipHash, "donations");
  if (limited) {
    return NextResponse.json({ error: "Too many submissions, please try again later" }, { status: 429 });
  }

  const { data: row, error: insertError } = await supabase
    .from("donations")
    .insert({
      amount_cents: amountCents,
      currency: "USD",
      status: "pending",
      donor_name: input.donorName || null,
      donor_email: input.email || null,
      dedication: input.dedication || null,
      ip_hash: ipHash,
      user_agent: request.headers.get("user-agent"),
      source_page: "/donate",
    })
    .select("id")
    .single();

  if (insertError || !row) {
    console.error("Failed to create donation row", insertError);
    return NextResponse.json({ error: "Something went wrong, please try again" }, { status: 500 });
  }

  try {
    const order = await createPayPalOrder({ donationId: row.id, amountCents });
    await supabase.from("donations").update({ paypal_order_id: order.id }).eq("id", row.id);
    return NextResponse.json({ orderId: order.id });
  } catch (err) {
    console.error("Failed to create PayPal order", err);
    await supabase.from("donations").update({ status: "failed" }).eq("id", row.id);
    return NextResponse.json({ error: "Unable to start checkout, please try again" }, { status: 502 });
  }
}
