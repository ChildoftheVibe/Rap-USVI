import { NextResponse } from "next/server";
import { eventCheckoutSchema } from "@/lib/validation/checkout";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { isRateLimited } from "@/lib/ratelimit";
import { getClientIp, hashIp, isHoneypotTripped } from "@/lib/requestMeta";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { createPayPalOrder } from "@/lib/paypal";
import { computeAvailability, getEventRsvpSummary } from "@/lib/events";
import type { EventRow } from "@/lib/events";
import { MAX_DONATION_CENTS, MIN_DONATION_CENTS } from "@/lib/donations";
import { findSponsorTier, isEventEnded, isSponsorTierSoldOut, settleStaleHolds } from "@/lib/eventCheckout";

/**
 * Starts a PayPal checkout for event seats or a sponsorship. The amount is
 * always computed here from the event's saved price, so a tampered request
 * can't change what PayPal charges. Seats are not held yet: the capture route
 * holds them in the database right before taking the money.
 */
export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  // Same reasoning as the donation route: the only success output is a real
  // PayPal order ID, so a tripped honeypot gets a plain error.
  if (isHoneypotTripped(body)) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const parsed = eventCheckoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please check the form and try again.", issues: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }
  const input = parsed.data;

  const supabase = createServiceRoleClient();

  const { data: eventData } = await supabase
    .from("events")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  const event = eventData as EventRow | null;
  if (!event) {
    return NextResponse.json({ error: "This event could not be found." }, { status: 404 });
  }
  if (isEventEnded(event)) {
    return NextResponse.json({ error: "This event has already ended." }, { status: 400 });
  }

  const ip = getClientIp(request);
  const ipHash = hashIp(ip);

  if (await isRateLimited(supabase, ipHash, "donations")) {
    return NextResponse.json({ error: "Too many attempts, please try again in a few minutes." }, { status: 429 });
  }

  if (!(await verifyTurnstileToken(input.turnstileToken, ip))) {
    return NextResponse.json({ error: "Verification failed. Please refresh the page and try again." }, { status: 403 });
  }

  // Free up seats or sponsor slots stuck behind a checkout PayPal never confirmed.
  try {
    await settleStaleHolds(supabase, event.id);
  } catch (err) {
    console.error("Stale hold sweep failed", err);
  }

  const email = input.email.toLowerCase();
  let amountCents: number;
  let description: string;
  let purposeFields: Record<string, unknown>;

  if (input.kind === "ticket") {
    if (event.ticket_price_cents === null || !event.rsvp_enabled) {
      return NextResponse.json({ error: "Tickets are not on sale for this event." }, { status: 400 });
    }
    if (input.quantity > event.ticket_max_per_order) {
      return NextResponse.json(
        { error: `You can buy up to ${event.ticket_max_per_order} seats at a time.` },
        { status: 400 }
      );
    }

    // A friendly early check only. claim_ticket_seats() does the real,
    // locked capacity check right before the payment is captured.
    const summary = await getEventRsvpSummary(supabase, event.id);
    const availability = computeAvailability(event.capacity, summary.confirmedHeadcount);
    if (availability.spotsLeft !== null && availability.spotsLeft < input.quantity) {
      const left = availability.spotsLeft;
      return NextResponse.json(
        { error: left === 0 ? "Sorry, this event is sold out." : `Only ${left} seat${left === 1 ? "" : "s"} left.` },
        { status: 409 }
      );
    }

    const { data: existing } = await supabase
      .from("event_rsvps")
      .select("status, guest_count")
      .eq("event_id", event.id)
      .eq("email", email)
      .maybeSingle();
    if (existing?.status === "confirmed" && existing.guest_count + input.quantity > 19) {
      return NextResponse.json(
        { error: "That's more seats than one email can hold. Please use a different email for the extra seats." },
        { status: 400 }
      );
    }

    amountCents = event.ticket_price_cents * input.quantity;
    description = `${input.quantity} seat${input.quantity === 1 ? "" : "s"}: ${event.title}`;
    purposeFields = { purpose: "ticket", quantity: input.quantity };
  } else {
    const tier = findSponsorTier(event, input.tierKey);
    if (!tier) {
      return NextResponse.json({ error: "That sponsor level is not available." }, { status: 400 });
    }
    if (await isSponsorTierSoldOut(supabase, event.id, tier)) {
      return NextResponse.json({ error: `The ${tier.name} level is fully sponsored.` }, { status: 409 });
    }

    amountCents = tier.amountCents;
    description = `${tier.name} sponsorship: ${event.title}`;
    purposeFields = {
      purpose: "sponsorship",
      sponsor_tier_key: tier.key,
      sponsor_tier_name: tier.name,
      organization: input.organization || null,
    };
  }

  if (amountCents < MIN_DONATION_CENTS || amountCents > MAX_DONATION_CENTS) {
    return NextResponse.json(
      { error: "This amount can't be paid online. Please contact us and we'll help you pay another way." },
      { status: 400 }
    );
  }

  const { data: row, error: insertError } = await supabase
    .from("donations")
    .insert({
      ...purposeFields,
      event_id: event.id,
      amount_cents: amountCents,
      currency: "USD",
      status: "pending",
      donor_name: input.fullName,
      donor_email: email,
      phone: input.phone || null,
      ip_hash: ipHash,
      user_agent: request.headers.get("user-agent"),
      source_page: `/events/${event.slug}`,
    })
    .select("id")
    .single();

  if (insertError || !row) {
    console.error("Failed to create event payment row", insertError);
    return NextResponse.json({ error: "Something went wrong, please try again" }, { status: 500 });
  }

  try {
    const order = await createPayPalOrder({ donationId: row.id, amountCents, description });
    await supabase.from("donations").update({ paypal_order_id: order.id }).eq("id", row.id);
    return NextResponse.json({ orderId: order.id });
  } catch (err) {
    console.error("Failed to create PayPal order for event payment", err);
    await supabase.from("donations").update({ status: "failed" }).eq("id", row.id);
    return NextResponse.json({ error: "Unable to start checkout, please try again" }, { status: 502 });
  }
}
