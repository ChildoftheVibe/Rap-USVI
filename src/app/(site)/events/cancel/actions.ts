"use server";

import { revalidatePath } from "next/cache";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { sendRsvpCancellationEmail, resolvePendingWaitlistPromotions } from "@/lib/eventEmail";
import type { EventRow } from "@/lib/events";

export interface CancelRsvpResult {
  success: boolean;
  message: string;
}

/**
 * Public, unauthenticated action — the cancel_token itself (a 24-byte random
 * value, unguessable, delivered only via email) is the credential here, the
 * same trust model as the email-unsubscribe links elsewhere in the app.
 */
export async function cancelRsvpByToken(token: string): Promise<CancelRsvpResult> {
  const supabase = createServiceRoleClient();

  const { data: rsvp } = await supabase
    .from("event_rsvps")
    .select("*, events(*)")
    .eq("cancel_token", token)
    .maybeSingle();

  if (!rsvp) {
    return { success: false, message: "This cancellation link is invalid or has expired." };
  }
  if (rsvp.status === "cancelled") {
    return { success: true, message: "This RSVP was already cancelled." };
  }

  const event = (Array.isArray(rsvp.events) ? rsvp.events[0] : rsvp.events) as EventRow;

  const { error } = await supabase.from("event_rsvps").update({ status: "cancelled" }).eq("id", rsvp.id);
  if (error) {
    return { success: false, message: "Something went wrong. Please try again." };
  }

  try {
    await sendRsvpCancellationEmail({
      event,
      fullName: rsvp.full_name,
      email: rsvp.email,
      guestCount: rsvp.guest_count,
      cancelToken: rsvp.cancel_token,
    });
  } catch (err) {
    console.error("Failed to send RSVP cancellation email", err);
  }

  // The fn_promote_waitlist DB trigger already promoted anyone off the
  // waitlist atomically as part of the update above — this just sends the
  // emails for whoever it promoted.
  await resolvePendingWaitlistPromotions(supabase, event.id);

  revalidatePath(`/events/${event.slug}`);

  return { success: true, message: "Your RSVP has been cancelled." };
}
