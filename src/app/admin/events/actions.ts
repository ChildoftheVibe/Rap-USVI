"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createServerSupabaseClient, createServiceRoleClient } from "@/lib/supabase/server";
import { eventSchema, eventStatusValues, type EventInput, type EventStatus } from "@/lib/validation/event";
import { astLocalInputToIso, type FlyerRatio } from "@/lib/events";
import { sanitizeEventDescription } from "@/lib/sanitizeHtml";
import { resolvePendingWaitlistPromotions } from "@/lib/eventEmail";
import type { RsvpStatus } from "@/lib/events";

const IMAGE_BUCKET = "event-flyers";
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const MEDIA_BUCKET = "event-media";
const MAX_MEDIA_BYTES = 25 * 1024 * 1024;
const ALLOWED_MEDIA_TYPES: Record<string, { extension: string; mediaType: "image" | "video" }> = {
  "image/jpeg": { extension: "jpg", mediaType: "image" },
  "image/png": { extension: "png", mediaType: "image" },
  "image/webp": { extension: "webp", mediaType: "image" },
  "video/mp4": { extension: "mp4", mediaType: "video" },
  "video/webm": { extension: "webm", mediaType: "video" },
  "video/quicktime": { extension: "mov", mediaType: "video" },
};

const FLYER_RATIO_COLUMNS: Record<FlyerRatio, { url: string; path: string }> = {
  "3x5": { url: "flyer_3x5_url", path: "flyer_3x5_path" },
  "4x5": { url: "flyer_4x5_url", path: "flyer_4x5_path" },
  "9x16": { url: "flyer_9x16_url", path: "flyer_9x16_path" },
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
    description: data.description ? sanitizeEventDescription(data.description) : "",
    location_name: data.locationName || "",
    location_address: data.locationAddress || "",
    start_at: astLocalInputToIso(data.startAt),
    end_at: astLocalInputToIso(data.endAt),
    status: data.status,
    capacity: data.capacity ?? null,
    waitlist_enabled: data.waitlistEnabled,
    rsvp_enabled: data.rsvpEnabled,
    banner_alt: data.bannerAlt || null,
    popup_enabled: data.popupEnabled,
    popup_headline: data.popupHeadline || null,
    popup_body: data.popupBody || null,
    popup_cta_label: data.popupCtaLabel,
    popup_starts_at: data.popupStartsAt ? astLocalInputToIso(data.popupStartsAt) : null,
    popup_ends_at: data.popupEndsAt ? astLocalInputToIso(data.popupEndsAt) : null,
    popup_image_source: data.popupImageSource,
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

export async function updateEventStatus(id: string, status: EventStatus) {
  await requireUser();
  if (!eventStatusValues.includes(status)) throw new Error("Invalid status");

  const serviceRole = createServiceRoleClient();
  const { data: existing } = await serviceRole.from("events").select("slug").eq("id", id).maybeSingle();

  const { error } = await serviceRole.from("events").update({ status }).eq("id", id);
  if (error) throw new Error("Failed to update status");

  revalidatePath("/admin/events");
  revalidatePath(`/admin/events/${id}`);
  revalidatePath("/events");
  revalidatePath("/");
  if (existing?.slug) revalidatePath(`/events/${existing.slug}`);
}

export async function deleteEvent(id: string) {
  await requireUser();
  const serviceRole = createServiceRoleClient();

  const { data: event } = await serviceRole
    .from("events")
    .select("banner_path, flyer_3x5_path, flyer_4x5_path, flyer_9x16_path")
    .eq("id", id)
    .maybeSingle();
  const { data: mediaRows } = await serviceRole.from("event_media").select("path").eq("event_id", id);

  const imagePaths = [event?.banner_path, event?.flyer_3x5_path, event?.flyer_4x5_path, event?.flyer_9x16_path].filter(
    (path): path is string => !!path
  );
  if (imagePaths.length > 0) {
    await serviceRole.storage.from(IMAGE_BUCKET).remove(imagePaths);
  }
  const mediaPaths = (mediaRows ?? []).map((row) => row.path);
  if (mediaPaths.length > 0) {
    await serviceRole.storage.from(MEDIA_BUCKET).remove(mediaPaths);
  }

  const { error } = await serviceRole.from("events").delete().eq("id", id);
  if (error) throw new Error("Failed to delete event");

  revalidatePath("/admin/events");
  revalidatePath("/events");
  redirect("/admin/events");
}

export async function uploadEventBanner(id: string, formData: FormData) {
  await requireUser();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Choose an image to upload");
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error("Image must be 5MB or smaller");
  }
  const extension = ALLOWED_IMAGE_TYPES[file.type];
  if (!extension) {
    throw new Error("Image must be JPEG, PNG, or WebP");
  }

  const serviceRole = createServiceRoleClient();
  const { data: event } = await serviceRole.from("events").select("banner_path").eq("id", id).maybeSingle();

  const path = `${id}/banner-${Date.now()}.${extension}`;
  const { error: uploadError } = await serviceRole.storage
    .from(IMAGE_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (uploadError) throw new Error("Failed to upload image");

  const { data: publicUrlData } = serviceRole.storage.from(IMAGE_BUCKET).getPublicUrl(path);

  const { error: updateError } = await serviceRole
    .from("events")
    .update({ banner_url: publicUrlData.publicUrl, banner_path: path })
    .eq("id", id);
  if (updateError) throw new Error("Failed to save image");

  // Best-effort cleanup of the previous banner, after the new one is live.
  if (event?.banner_path) {
    await serviceRole.storage.from(IMAGE_BUCKET).remove([event.banner_path]);
  }

  revalidatePath(`/admin/events/${id}`);
  revalidatePath("/events");

  return { url: publicUrlData.publicUrl };
}

export async function removeEventBanner(id: string) {
  await requireUser();
  const serviceRole = createServiceRoleClient();
  const { data: event } = await serviceRole.from("events").select("banner_path").eq("id", id).maybeSingle();

  if (event?.banner_path) {
    await serviceRole.storage.from(IMAGE_BUCKET).remove([event.banner_path]);
  }

  const { error } = await serviceRole.from("events").update({ banner_url: null, banner_path: null }).eq("id", id);
  if (error) throw new Error("Failed to remove image");

  revalidatePath(`/admin/events/${id}`);
  revalidatePath("/events");
}

export async function uploadEventFlyerRatio(id: string, ratio: FlyerRatio, formData: FormData) {
  await requireUser();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Choose an image to upload");
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error("Image must be 5MB or smaller");
  }
  const extension = ALLOWED_IMAGE_TYPES[file.type];
  if (!extension) {
    throw new Error("Image must be JPEG, PNG, or WebP");
  }

  const columns = FLYER_RATIO_COLUMNS[ratio];
  const serviceRole = createServiceRoleClient();
  const { data: event } = await serviceRole.from("events").select(columns.path).eq("id", id).maybeSingle();

  const path = `${id}/flyer-${ratio}-${Date.now()}.${extension}`;
  const { error: uploadError } = await serviceRole.storage
    .from(IMAGE_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (uploadError) throw new Error("Failed to upload image");

  const { data: publicUrlData } = serviceRole.storage.from(IMAGE_BUCKET).getPublicUrl(path);

  const { error: updateError } = await serviceRole
    .from("events")
    .update({ [columns.url]: publicUrlData.publicUrl, [columns.path]: path })
    .eq("id", id);
  if (updateError) throw new Error("Failed to save image");

  const previousPath = (event as Record<string, string | null> | null)?.[columns.path];
  if (previousPath) {
    await serviceRole.storage.from(IMAGE_BUCKET).remove([previousPath]);
  }

  revalidatePath(`/admin/events/${id}`);

  return { url: publicUrlData.publicUrl };
}

export async function removeEventFlyerRatio(id: string, ratio: FlyerRatio) {
  await requireUser();
  const columns = FLYER_RATIO_COLUMNS[ratio];
  const serviceRole = createServiceRoleClient();
  const { data: event } = await serviceRole.from("events").select(columns.path).eq("id", id).maybeSingle();

  const previousPath = (event as Record<string, string | null> | null)?.[columns.path];
  if (previousPath) {
    await serviceRole.storage.from(IMAGE_BUCKET).remove([previousPath]);
  }

  const { error } = await serviceRole
    .from("events")
    .update({ [columns.url]: null, [columns.path]: null })
    .eq("id", id);
  if (error) throw new Error("Failed to remove image");

  revalidatePath(`/admin/events/${id}`);
}

export async function addEventMedia(id: string, formData: FormData) {
  await requireUser();
  const file = formData.get("file");
  const alt = formData.get("alt");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Choose an image or video to upload");
  }
  if (file.size > MAX_MEDIA_BYTES) {
    throw new Error("File must be 25MB or smaller");
  }
  const typeInfo = ALLOWED_MEDIA_TYPES[file.type];
  if (!typeInfo) {
    throw new Error("File must be JPEG, PNG, WebP, MP4, WebM, or MOV");
  }

  const serviceRole = createServiceRoleClient();
  const path = `${id}/${Date.now()}.${typeInfo.extension}`;
  const { error: uploadError } = await serviceRole.storage
    .from(MEDIA_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (uploadError) throw new Error("Failed to upload file");

  const { data: publicUrlData } = serviceRole.storage.from(MEDIA_BUCKET).getPublicUrl(path);

  const { data: row, error: insertError } = await serviceRole
    .from("event_media")
    .insert({
      event_id: id,
      media_type: typeInfo.mediaType,
      url: publicUrlData.publicUrl,
      path,
      alt: typeof alt === "string" && alt.trim() ? alt.trim() : null,
    })
    .select("id, media_type, url, path, alt, created_at")
    .single();
  if (insertError || !row) {
    await serviceRole.storage.from(MEDIA_BUCKET).remove([path]);
    throw new Error("Failed to save upload");
  }

  revalidatePath(`/admin/events/${id}`);
  revalidatePath("/events");

  return row;
}

export async function removeEventMedia(mediaId: string, eventId: string) {
  await requireUser();
  const serviceRole = createServiceRoleClient();
  const { data: media } = await serviceRole.from("event_media").select("path").eq("id", mediaId).maybeSingle();

  if (media?.path) {
    await serviceRole.storage.from(MEDIA_BUCKET).remove([media.path]);
  }

  const { error } = await serviceRole.from("event_media").delete().eq("id", mediaId);
  if (error) throw new Error("Failed to remove upload");

  revalidatePath(`/admin/events/${eventId}`);
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
