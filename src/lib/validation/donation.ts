import { z } from "zod";
import { MIN_DONATION_CENTS, MAX_DONATION_CENTS } from "@/lib/donations";

// No turnstileToken here — see the comment in
// src/app/api/donations/create-order/route.ts for why the donation flow
// deliberately skips Turnstile.
export const donationCreateSchema = z.object({
  amount: z
    .number()
    .min(MIN_DONATION_CENTS / 100, `Minimum donation is $${MIN_DONATION_CENTS / 100}`)
    .max(MAX_DONATION_CENTS / 100, `Maximum online donation is $${(MAX_DONATION_CENTS / 100).toLocaleString()}`)
    .refine((v) => Number.isInteger(Math.round(v * 100)), "Amount can have at most 2 decimal places"),
  donorName: z.string().trim().max(200).optional().or(z.literal("")),
  email: z.string().trim().email("Enter a valid email address").max(320).optional().or(z.literal("")),
  dedication: z.string().trim().max(500).optional().or(z.literal("")),
  // honeypot: real users never fill this in; must arrive empty
  company: z.string().max(0).optional().or(z.literal("")),
});

export type DonationCreateInput = z.infer<typeof donationCreateSchema>;

export const donationCaptureSchema = z.object({
  orderId: z.string().trim().min(1).max(64),
});

export type DonationCaptureInput = z.infer<typeof donationCaptureSchema>;

export const donationReceiptTemplateSchema = z.object({
  subject: z.string().trim().min(1, "Subject is required").max(300),
  htmlBody: z.string().trim().min(1, "HTML content is required").max(200000),
});

export type DonationReceiptTemplateInput = z.infer<typeof donationReceiptTemplateSchema>;
