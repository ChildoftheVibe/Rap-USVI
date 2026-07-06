"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createServerSupabaseClient, createServiceRoleClient } from "@/lib/supabase/server";
import { eventSchema, type EventInput } from "@/lib/validation/event";
import { astLocalInputToIso } from "@/lib/events";
import { resolvePendingWaitlistPromotions } from "@/lib/eventEmail";
import type { RsvpStatus } from "@/lib/events";

const FLYER_BUCKET = "event-flyers";
const MAX_FLYER_BYTES = 5 * 1024 * 1024;
const ALLOWED_FLYER_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

async function requireUser() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/admin/login");
  }
  return user;
}

function parseOrThrow(input: EventInput) {
  const parsed = eventSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid input");
  }
  return parsed.data;
}

function toEventRecord(data: EventInput) {
  return {
    title: data.title,
    slug: data.slug,
    description: data.description || "",
    location_name: data.locationName || "",
    location_address: data.locationAddress || "",
    start_at: astLocalInputToIso(data.startAt),
    end_at: astLocalInputToIso(data.endAt),
    status: data.status,
    capacity: data.capacity ?? null,
    waitlist_enabled: data.waitlistEnabled,
    rsvp_enabled: data.rsvpEnabled,
    flyer_alt: data.flyerAlt || null,
    popup_enabled: data.popupEnabled,
    popup_headline: data.popupHeadline || null,
    popup_body: data.popupBody || null,
    popup_cta_label: data.popupCtaLabel,
    popup_starts_at: data.popupStartsAt ? astLocalInputToIso(data.popupStartsAt) : null,
    popup_ends_at: data.popupEndsAt ? astLocalInputToIso(data.popupEndsAt) : null,
  };
}

function friendlyInsertError(error: { code?: string } | null): string {
  if (error?.code === "23505") return "An event with this slug already exists";
  return "Failed to save event";
}

export async function createEvent(input: EventInput) {
  const user = await requireUser();
  const data = parseOrThrow(input);

  const serviceRole = createServiceRoleClient();
  const { data: row, error } = await serviceRole
    .from("events")
    .insert({ ...toEventRecord(data), created_by: user.email ?? "admin" })
    .select("id")
    .single();

  if (error || !row) throw new Error(friendlyInsertError(error));

  revalidatePath("/admin/events");
  revalidatePath("/events");
  redirect(`/admin/events/${row.id}`);
}

export async function updateEvent(id: string, input: EventInput) {
  await requireUser();
  const data = parseOrThrow(input);

  const serviceRole = createServiceRoleClient();
  const { data: existing } = await serviceRole.from("events").select("slug").eq("id", id).maybeSingle();

  const { error } = await serviceRole.from("events").update(toEventRecord(data)).eq("id", id);
  if (error) throw new Error(friendlyInsertError(error));

  revalidatePath("/admin/events");
  revalidatePath(`/admin/events/${id}`);
  revalidatePath("/events");
  if (existing?.slug) revalidatePath(`/events/${existing.slug}`);
  revalidatePath(`/events/${data.slug}`);
}

export async function deleteEvent(id: string) {
  await requireUser();
  const serviceRole = createServiceRoleClient();

  const { data: event } = await serviceRole.from("events").select("flyer_path").eq("id", id).maybeSingle();
  if (event?.flyer_path) {
    await serviceRole.storage.from(FLYER_BUCKET).remove([event.flyer_path]);
  }

  const { error } = await serviceRole.from("events").delete().eq("id", id);
  if (error) throw new Error("Failed to delete event");

  revalidatePath("/admin/events");
  revalidatePath("/events");
  redirect("/admin/events");
}

export async function uploadEventFlyer(id: string, formData: FormData) {
  await requireUser();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Choose an image to upload");
  }
  if (file.size > MAX_FLYER_BYTES) {
    throw new Error("Image must be 5MB or smaller");
  }
  const extension = ALLOWED_FLYER_TYPES[file.type];
  if (!extension) {
    throw new Error("Image must be JPEG, PNG, or WebP");
  }

  const serviceRole = createServiceRoleClient();
  const { data: event } = await serviceRole.from("events").select("flyer_path").eq("id", id).maybeSingle();

  const path = `${id}/${Date.now()}.${extension}`;
  const { error: uploadError } = await serviceRole.storage
    .from(FLYER_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (uploadError) throw new Error("Failed to upload image");

  const { data: publicUrlData } = serviceRole.storage.from(FLYER_BUCKET).getPublicUrl(path);

  const { error: updateError } = await serviceRole
    .from("events")
    .update({ flyer_url: publicUrlData.publicUrl, flyer_path: path })
    .eq("id", id);
  if (updateError) throw new Error("Failed to save image");

  // Best-effort cleanup of the previous flyer, after the new one is live.
  if (event?.flyer_path) {
    await serviceRole.storage.from(FLYER_BUCKET).remove([event.flyer_path]);
  }

  revalidatePath(`/admin/events/${id}`);
  revalidatePath("/events");

  return { url: publicUrlData.publicUrl };
}

export async function removeEventFlyer(id: string) {
  await requireUser();
  const serviceRole = createServiceRoleClient();
  const { data: event } = await serviceRole.from("events").select("flyer_path").eq("id", id).maybeSingle();

  if (event?.flyer_path) {
    await serviceRole.storage.from(FLYER_BUCKET).remove([event.flyer_path]);
  }

  const { error } = await serviceRole.from("events").update({ flyer_url: null, flyer_path: null }).eq("id", id);
  if (error) throw new Error("Failed to remove image");

  revalidatePath(`/admin/events/${id}`);
  revalidatePath("/events");
}

export async function updateRsvpStatus(rsvpId: string, eventId: string, status: RsvpStatus) {
  await requireUser();
  const serviceRole = createServiceRoleClient();

  const { error } = await serviceRole.from("event_rsvps").update({ status }).eq("id", rsvpId);
  if (error) throw new Error("Failed to update RSVP");

  // Mirrors the public cancel flow: the DB trigger promotes waitlisted RSVPs
  // atomically when this cancellation frees up capacity; this just emails
  // whoever it promoted.
  if (status === "cancelled") {
    await resolvePendingWaitlistPromotions(serviceRole, eventId);
  }

  revalidatePath(`/admin/events/${eventId}/rsvps`);
}

export async function toggleRsvpCheckIn(rsvpId: string, eventId: string, checkedIn: boolean) {
  await requireUser();
  const serviceRole = createServiceRoleClient();
  const { error } = await serviceRole
    .from("event_rsvps")
    .update({ checked_in_at: checkedIn ? new Date().toISOString() : null })
    .eq("id", rsvpId);
  if (error) throw new Error("Failed to update check-in status");

  revalidatePath(`/admin/events/${eventId}/rsvps`);
}

export async function deleteRsvp(rsvpId: string, eventId: string) {
  await requireUser();
  const serviceRole = createServiceRoleClient();
  const { error } = await serviceRole.from("event_rsvps").delete().eq("id", rsvpId);
  if (error) throw new Error("Failed to delete RSVP");

  revalidatePath(`/admin/events/${eventId}/rsvps`);
}
