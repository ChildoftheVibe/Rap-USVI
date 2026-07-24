import { z } from "zod";

export const eventStatusValues = ["draft", "published", "cancelled"] as const;
export type EventStatus = (typeof eventStatusValues)[number];

export const popupImageSourceValues = ["none", "banner", "flyer_3x5", "flyer_4x5", "flyer_9x16"] as const;
export type PopupImageSource = (typeof popupImageSourceValues)[number];

const slugPattern = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Datetime-local input value (`YYYY-MM-DDTHH:mm`), treated as America/St_Thomas wall-clock time. */
const localDateTimeSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Enter a valid date and time");

export const eventSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required").max(200),
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .min(1, "Slug is required")
      .max(200)
      .regex(slugPattern, "Use lowercase letters, numbers, and hyphens only"),
    description: z.string().trim().max(20000).optional().or(z.literal("")),
    locationName: z.string().trim().max(200).optional().or(z.literal("")),
    locationAddress: z.string().trim().max(300).optional().or(z.literal("")),
    startAt: localDateTimeSchema,
    endAt: localDateTimeSchema,
    status: z.enum(eventStatusValues),
    capacity: z.coerce.number().int().min(1).max(1_000_000).nullable().optional(),
    waitlistEnabled: z.boolean().default(true),
    rsvpEnabled: z.boolean().default(true),
    bannerAlt: z.string().trim().max(300).optional().or(z.literal("")),
    popupEnabled: z.boolean().default(false),
    popupHeadline: z.string().trim().max(200).optional().or(z.literal("")),
    popupBody: z.string().trim().max(500).optional().or(z.literal("")),
    popupCtaLabel: z.string().trim().min(1).max(60).default("RSVP Now"),
    popupStartsAt: localDateTimeSchema.optional().or(z.literal("")),
    popupEndsAt: localDateTimeSchema.optional().or(z.literal("")),
    popupImageSource: z.enum(popupImageSourceValues).default("banner"),
  })
  .refine((data) => data.endAt > data.startAt, {
    message: "End time must be after the start time",
    path: ["endAt"],
  })
  .refine(
    (data) => !data.popupStartsAt || !data.popupEndsAt || data.popupEndsAt > data.popupStartsAt,
    { message: "Popup end time must be after its start time", path: ["popupEndsAt"] }
  );

export type EventInput = z.infer<typeof eventSchema>;
