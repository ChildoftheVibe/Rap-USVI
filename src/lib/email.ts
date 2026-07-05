import { Resend } from "resend";
import type { InquiryInput } from "@/lib/validation/inquiry";
import { interestAreas } from "@/lib/content";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function interestLabel(value: string): string {
  return interestAreas.find((a) => a.value === value)?.label ?? value;
}

function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  return new Resend(apiKey);
}

export async function sendStaffNotification(input: InquiryInput): Promise<void> {
  const resend = getResendClient();
  const to = process.env.RESEND_STAFF_NOTIFY_TO?.split(",").map((s) => s.trim());
  const from = process.env.RESEND_FROM_EMAIL;
  if (!resend || !to?.length || !from) {
    throw new Error("Resend is not fully configured (RESEND_API_KEY / RESEND_STAFF_NOTIFY_TO / RESEND_FROM_EMAIL)");
  }

  await resend.emails.send({
    from,
    to,
    replyTo: input.email,
    subject: `New inquiry: ${interestLabel(input.interestArea)} — ${input.fullName}`,
    html: `
      <p><strong>Interest area:</strong> ${escapeHtml(interestLabel(input.interestArea))}</p>
      <p><strong>Name:</strong> ${escapeHtml(input.fullName)}</p>
      <p><strong>Email:</strong> ${escapeHtml(input.email)}</p>
      <p><strong>Message:</strong></p>
      <p>${escapeHtml(input.message).replace(/\n/g, "<br>")}</p>
    `,
  });
}

export async function sendSubmitterAutoReply(input: InquiryInput): Promise<void> {
  const resend = getResendClient();
  const from = process.env.RESEND_FROM_EMAIL;
  if (!resend || !from) {
    throw new Error("Resend is not fully configured (RESEND_API_KEY / RESEND_FROM_EMAIL)");
  }

  const donationNote =
    input.interestArea === "donation_inquiry"
      ? "<p>Online giving is coming soon. In the meantime, our team will reach out directly about how to give.</p>"
      : "";

  await resend.emails.send({
    from,
    to: input.email,
    subject: "Thanks for reaching out to Restore America's Paradise",
    html: `
      <p>Hi ${escapeHtml(input.fullName)},</p>
      <p>Thank you for contacting Restore America's Paradise. We've received your message and someone from our team will follow up soon.</p>
      ${donationNote}
      <p>— Restore America's Paradise</p>
    `,
  });
}
