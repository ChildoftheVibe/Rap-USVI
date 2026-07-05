import { Resend } from "resend";
import type { InquiryInput } from "@/lib/validation/inquiry";
import { interestAreas, site, contact } from "@/lib/content";

const BRAND = {
  primary: "#0047ab",
  gold: "#e5b80b",
  ink: "#191c1d",
  inkVariant: "#434653",
  outline: "#e1e3e4",
  surface: "#f3f4f5",
  logoUrl: `${site.url}/logo/rap-logo-email.png`,
};

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

/** Shared branded shell (table-based layout + inline styles for email-client compatibility). */
function renderEmailShell(bodyHtml: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
  <body style="margin:0; padding:0; background-color:${BRAND.surface}; font-family:Arial, Helvetica, sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${BRAND.surface}; padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px; background-color:#ffffff; border-radius:8px; overflow:hidden; border:1px solid ${BRAND.outline};">
            <tr>
              <td style="background-color:${BRAND.primary}; padding:28px 32px; text-align:center;">
                <img src="${BRAND.logoUrl}" width="56" height="56" alt="${site.name} seal" style="display:block; margin:0 auto 12px;" />
                <div style="color:#ffffff; font-size:19px; font-weight:bold; font-family:Georgia, 'Times New Roman', serif;">
                  ${site.name}
                </div>
                <div style="color:${BRAND.gold}; font-size:12px; font-style:italic; margin-top:4px;">
                  ${site.tagline}
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:32px; color:${BRAND.ink}; font-size:15px; line-height:1.6;">
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="background-color:${BRAND.surface}; padding:24px 32px; border-top:1px solid ${BRAND.outline}; color:${BRAND.inkVariant}; font-size:12px; line-height:1.7; text-align:center;">
                <div>
                  <a href="${site.url}" style="color:${BRAND.primary}; text-decoration:none; font-weight:bold;">${site.domain}</a>
                  &nbsp;&middot;&nbsp;
                  <a href="mailto:${contact.emails[0]}" style="color:${BRAND.primary}; text-decoration:none;">${contact.emails[0]}</a>
                  &nbsp;&middot;&nbsp;
                  <a href="${contact.phoneHref}" style="color:${BRAND.primary}; text-decoration:none;">${contact.phone}</a>
                </div>
                <div style="margin-top:6px;">${contact.location}</div>
                <div style="margin-top:10px; color:#737784;">
                  ${site.legalName} is a tax-exempt 501(c)(3) organization. Donations are tax-deductible to the extent allowed by law.
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function renderField(label: string, value: string): string {
  return `
    <tr>
      <td style="padding:4px 12px 4px 0; color:${BRAND.inkVariant}; font-size:12px; font-weight:bold; text-transform:uppercase; letter-spacing:0.04em; white-space:nowrap; vertical-align:top;">
        ${label}
      </td>
      <td style="padding:4px 0; color:${BRAND.ink}; font-size:15px; vertical-align:top;">
        ${value}
      </td>
    </tr>`;
}

export async function sendStaffNotification(input: InquiryInput): Promise<void> {
  const resend = getResendClient();
  const to = process.env.RESEND_STAFF_NOTIFY_TO?.split(",").map((s) => s.trim());
  const from = process.env.RESEND_FROM_EMAIL;
  if (!resend || !to?.length || !from) {
    throw new Error("Resend is not fully configured (RESEND_API_KEY / RESEND_STAFF_NOTIFY_TO / RESEND_FROM_EMAIL)");
  }

  const submittedAt = new Date().toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/St_Thomas",
  });

  const body = `
    <div style="display:inline-block; background-color:${BRAND.gold}; color:${BRAND.primary}; font-size:12px; font-weight:bold; text-transform:uppercase; letter-spacing:0.04em; padding:4px 12px; border-radius:999px; margin-bottom:16px;">
      New Stakeholder Inquiry
    </div>
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%; margin-bottom:20px;">
      ${renderField("Interest area", escapeHtml(interestLabel(input.interestArea)))}
      ${renderField("Name", escapeHtml(input.fullName))}
      ${renderField("Email", `<a href="mailto:${escapeHtml(input.email)}" style="color:${BRAND.primary};">${escapeHtml(input.email)}</a>`)}
      ${renderField("Submitted", submittedAt + " AST")}
    </table>
    <div style="border-top:1px solid ${BRAND.outline}; padding-top:16px;">
      <div style="font-size:12px; font-weight:bold; text-transform:uppercase; letter-spacing:0.04em; color:${BRAND.inkVariant}; margin-bottom:8px;">
        Message
      </div>
      <div style="background-color:${BRAND.surface}; border-radius:8px; padding:16px; color:${BRAND.ink};">
        ${escapeHtml(input.message).replace(/\n/g, "<br>")}
      </div>
    </div>
    <p style="margin-top:20px; color:${BRAND.inkVariant}; font-size:13px;">
      Reply directly to this email to respond to ${escapeHtml(input.fullName)} — Reply-To is already set to their address.
    </p>`;

  await resend.emails.send({
    from,
    to,
    replyTo: input.email,
    subject: `New inquiry: ${interestLabel(input.interestArea)} — ${input.fullName}`,
    html: renderEmailShell(body),
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
      ? `<p>Online giving is coming soon. In the meantime, reach out to
         <a href="mailto:${contact.emails[1] ?? contact.emails[0]}" style="color:${BRAND.primary};">${contact.emails[1] ?? contact.emails[0]}</a>
         and our team will follow up directly about how to give.</p>`
      : "";

  const body = `
    <p style="margin-top:0;">Hi ${escapeHtml(input.fullName)},</p>
    <p>Thank you for contacting ${site.name}. We've received your message regarding
       <strong>${escapeHtml(interestLabel(input.interestArea))}</strong> and someone from our team will follow up soon.</p>
    ${donationNote}
    <p>In the meantime, feel free to explore our mission and upcoming initiatives at
       <a href="${site.url}" style="color:${BRAND.primary};">${site.domain}</a>, or reach us directly using the
       contact details below.</p>
    <p style="margin-bottom:0;">— ${site.name}</p>`;

  await resend.emails.send({
    from,
    to: input.email,
    subject: `Thanks for reaching out to ${site.name}`,
    html: renderEmailShell(body),
  });
}
