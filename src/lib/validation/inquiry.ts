import { z } from "zod";

export const interestAreaValues = [
  "academy_enrollment",
  "corporate_sponsorship",
  "volunteer_opportunities",
  "donation_inquiry",
] as const;

export const inquirySchema = z.object({
  fullName: z.string().trim().min(1, "Full name is required").max(200),
  email: z.string().trim().email("Enter a valid email address").max(320),
  interestArea: z.enum(interestAreaValues, {
    message: "Select an interest area",
  }),
  message: z.string().trim().min(1, "Message is required").max(5000),
  // honeypot: real users never fill this in; must arrive empty
  company: z.string().max(0).optional().or(z.literal("")),
  turnstileToken: z.string().min(1, "Verification is required"),
});

export type InquiryInput = z.infer<typeof inquirySchema>;
