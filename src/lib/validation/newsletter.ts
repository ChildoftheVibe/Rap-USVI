import { z } from "zod";

export const newsletterSignupSchema = z.object({
  email: z.string().trim().email("Enter a valid email address").max(320),
  // honeypot: real users never fill this in; must arrive empty
  company: z.string().max(0).optional().or(z.literal("")),
  // Not enforced with .min() here: it's a hidden field with no visible input,
  // so a schema failure would block submission with no error shown to the
  // user. The component checks for an empty token explicitly before
  // submitting, and the server always re-verifies the token with Cloudflare
  // regardless of what the client sends.
  turnstileToken: z.string(),
});

export type NewsletterSignupInput = z.infer<typeof newsletterSignupSchema>;
