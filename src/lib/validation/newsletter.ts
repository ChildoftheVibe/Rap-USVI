import { z } from "zod";

export const newsletterSignupSchema = z.object({
  email: z.string().trim().email("Enter a valid email address").max(320),
  // honeypot: real users never fill this in; must arrive empty
  company: z.string().max(0).optional().or(z.literal("")),
  turnstileToken: z.string().min(1, "Verification is required"),
});

export type NewsletterSignupInput = z.infer<typeof newsletterSignupSchema>;
