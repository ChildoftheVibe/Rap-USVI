import { z } from "zod";

export const availabilityDayValues = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export const availabilityHoursValues = ["mornings", "afternoons", "evenings", "flexible"] as const;
export const commitmentLevelValues = ["one_time", "weekly", "monthly", "ongoing"] as const;
export const certificationValues = ["cpr", "first_aid", "other"] as const;

export const volunteerSchema = z.object({
  fullName: z.string().trim().min(1, "Full name is required").max(200),
  phone: z.string().trim().min(1, "Phone number is required").max(30),
  email: z.string().trim().email("Enter a valid email address").max(320),
  industry: z.string().trim().min(1, "Industry is required").max(200),
  availabilityDays: z
    .array(z.enum(availabilityDayValues))
    .min(1, "Select at least one day"),
  availabilityHours: z.enum(availabilityHoursValues, {
    message: "Select your availability",
  }),
  commitmentLevel: z.enum(commitmentLevelValues, {
    message: "Select a commitment level",
  }),
  skillsExperience: z.string().trim().max(5000).optional().or(z.literal("")),
  certifications: z.array(z.enum(certificationValues)).optional(),
  // honeypot: real users never fill this in; must arrive empty
  company: z.string().max(0).optional().or(z.literal("")),
  // Not enforced with .min() here: it's a hidden field with no visible input,
  // so a schema failure would block submission with no error shown to the
  // user. The component checks for an empty token explicitly before
  // submitting, and the server always re-verifies the token with Cloudflare
  // regardless of what the client sends.
  turnstileToken: z.string(),
});

export type VolunteerInput = z.infer<typeof volunteerSchema>;
