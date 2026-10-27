import { z } from "zod";

export const eventStatusValues = ["draft", "published", "cancelled"] as const;
export type EventStatus = (typeof eventStatusValues)[number];

export const popupImageSourceValues = ["none", "banner", "flyer_3x5", "flyer_4x5", "flyer_9x16"] as const;
export type PopupImageSource = (typeof popupImageSourceValues)[number];

const slugPattern = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Payments ride the donations table, which only accepts $5 to $25,000 per PayPal order. */
export const MIN_PAYMENT_DOLLARS = 5;
export const MAX_PAYMENT_DOLLARS = 25_000;

const dollarAmountSchema = z
  .number()
  .min(MIN_PAYMENT_DOLLARS, `Amount must be at least $${MIN_PAYMENT_DOLLARS}`)
  .max(MAX_PAYMENT_DOLLARS, `Amount can't be more than $${MAX_PAYMENT_DOLLARS.toLocaleString()}`)
  .refine((v) => Math.abs(Math.round(v * 100) - v * 100) < 1e-6, "Amount can have at most 2 decimal places");

/** A sponsorship level as stored on `events.sponsor_tiers`. */
export interface SponsorTier {
  key: string;
  name: string;
  amountCents: number;
  description: string;
  /** How many sponsors can buy this level. Null means no limit. */
  limit: number | null;
  /** Complimentary event seats included with this level, held automatically at checkout. */
  seats: number;
}

export const sponsorTierInputSchema = z.object({
  key: z.string().trim().max(60).regex(/^[a-z0-9-]*$/).optional().or(z.literal("")),
  name: z.string().trim().min(1, "Each sponsor level needs a name").max(120),
  amount: dollarAmountSchema,
  description: z.string().trim().max(3000).optional().or(z.literal("")),
  limit: z.number().int().min(1).max(1000).nullable().optional(),
  seats: z.number().int().min(0).max(20).default(0),
});

export type SponsorTierInput = z.infer<typeof sponsorTierInputSchema>;

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
    /** Dollars per seat. Null keeps the event a free RSVP. */
    ticketPrice: dollarAmountSchema.nullable().optional(),
    ticketMaxPerOrder: z.number().int().min(1).max(20).default(8),
    sponsorTiers: z.array(sponsorTierInputSchema).max(10, "Use 10 sponsor levels or fewer").default([]),
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
