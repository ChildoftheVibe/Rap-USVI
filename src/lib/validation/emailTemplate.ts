import { z } from "zod";

export const emailTemplateSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  subject: z.string().trim().min(1, "Subject is required").max(300),
  htmlBody: z.string().trim().min(1, "HTML content is required").max(200000),
});

export type EmailTemplateInput = z.infer<typeof emailTemplateSchema>;
