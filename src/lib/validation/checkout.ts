import { z } from "zod";

const contactFields = {
  fullName: z.string().trim().min(1, "Full name is required").max(200),
  email: z.string().trim().email("Enter a valid email address").max(320),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  // honeypot: real users never fill this in; must arrive empty
  company: z.string().max(0).optional().or(z.literal("")),
  // Hidden field, re-verified with Cloudflare on the server (same pattern as the other forms).
  turnstileToken: z.string().default(""),
};

/** The client sends only what it wants to buy. Prices always come from the database, never from this payload. */
export const ticketCheckoutSchema = z.object({
  kind: z.literal("ticket"),
  quantity: z.number().int().min(1).max(20),
  ...contactFields,
});

export const sponsorCheckoutSchema = z.object({
  kind: z.literal("sponsorship"),
  tierKey: z.string().trim().min(1).max(60),
  organization: z.string().trim().max(200).optional().or(z.literal("")),
  ...contactFields,
});

export const eventCheckoutSchema = z.discriminatedUnion("kind", [ticketCheckoutSchema, sponsorCheckoutSchema]);

export type TicketCheckoutInput = z.infer<typeof ticketCheckoutSchema>;
export type SponsorCheckoutInput = z.infer<typeof sponsorCheckoutSchema>;
export type EventCheckoutInput = z.infer<typeof eventCheckoutSchema>;

export const eventCaptureSchema = z.object({
  orderId: z.string().trim().min(1).max(64),
});
