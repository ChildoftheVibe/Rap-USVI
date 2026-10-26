import { site, contact, donation as donationContent } from "@/lib/content";
import { formatUsd } from "@/lib/donations";
import { formatEventDateRange } from "@/lib/events";
import type { EventRow } from "@/lib/events";
import { BRAND, escapeHtml, getResendClient, renderEmailShell, renderField } from "@/lib/email";

function requireResend() {
  const resend = getResendClient();
  const from = process.env.RESEND_FROM_EMAIL;
  if (!resend || !from) {
    throw new Error("Resend is not fully configured (RESEND_API_KEY / RESEND_FROM_EMAIL)");
  }
  return { resend, from };
}

function formatPaidAt(iso: string): string {
  return `${new Date(iso).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/St_Thomas",
  })} AST`;
}

function badge(text: string): string {
  return `<div style="display:inline-block; background-color:${BRAND.gold}; color:${BRAND.primary}; font-size:12px; font-weight:bold; text-transform:uppercase; letter-spacing:0.04em; padding:4px 12px; border-radius:999px; margin-bottom:16px;">${escapeHtml(text)}</div>`;
}

function eventRows(event: EventRow): string {
  const location = [event.location_name, event.location_address].filter(Boolean).join(", ");
  return `
    ${renderField("Event", escapeHtml(event.title))}
    ${renderField("When", escapeHtml(formatEventDateRange(event.start_at, event.end_at)))}
    ${location ? renderField("Where", escapeHtml(location)) : ""}`;
}

function helpLine(): string {
  const email = contact.emails[0];
  return `<p style="font-size:13px; color:${BRAND.inkVariant};">
    Questions, changes, or refund requests? Email
    <a href="mailto:${escapeHtml(email)}" style="color:${BRAND.primary};">${escapeHtml(email)}</a>
    or call ${escapeHtml(contact.phone)}.
  </p>`;
}

interface TicketEmailParams {
  event: EventRow;
  fullName: string;
  email: string;
  quantity: number;
  amountCents: number;
  captureId: string;
  completedAt: string;
}

/**
 * Paid seats get this instead of the free RSVP email: it doubles as the
 * payment receipt, and it has no self-serve cancel link because cancelling a
 * paid seat needs a refund, which staff handle in PayPal.
 */
export async function sendTicketConfirmationEmail(params: TicketEmailParams): Promise<void> {
  const { resend, from } = requireResend();
  const seats = `${params.quantity} seat${params.quantity === 1 ? "" : "s"}`;

  const body = `
    ${badge("Your seats are confirmed")}
    <p style="margin-top:0;">Hi ${escapeHtml(params.fullName)},</p>
    <p>Thank you! Your payment went through and your ${escapeHtml(seats)} ${params.quantity === 1 ? "is" : "are"} reserved.
       Please bring this email or give your name at check in.</p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%; margin:20px 0;">
      ${eventRows(params.event)}
      ${renderField("Seats", escapeHtml(seats))}
      ${renderField("Amount paid", formatUsd(params.amountCents))}
      ${renderField("Paid", escapeHtml(formatPaidAt(params.completedAt)))}
      ${renderField("Transaction ID", escapeHtml(params.captureId))}
    </table>
    ${helpLine()}
    <div style="margin-top:20px; border-top:1px solid ${BRAND.outline}; padding-top:16px; font-size:12px; color:${BRAND.inkVariant}; line-height:1.6;">
      This payment is for event admission, including any meal served. Only the portion of a payment that is more
      than the fair market value of the goods and services received may be tax deductible. Please talk with your
      tax advisor. ${escapeHtml(site.legalName)} is a tax-exempt 501(c)(3) organization
      (EIN ${escapeHtml(donationContent.ein)}).
    </div>`;

  await resend.emails.send({
    from,
    to: params.email,
    subject: `Your seats are confirmed: ${params.event.title}`,
    html: renderEmailShell(body),
  });
}

interface SponsorshipEmailParams {
  event: EventRow;
  contactName: string;
  organization: string | null;
  email: string;
  tierName: string;
  amountCents: number;
  captureId: string;
  completedAt: string;
}

export async function sendSponsorshipReceiptEmail(params: SponsorshipEmailParams): Promise<void> {
  const { resend, from } = requireResend();
  const sponsorName = params.organization || params.contactName;

  const body = `
    ${badge("Sponsorship received")}
    <p style="margin-top:0;">Hi ${escapeHtml(params.contactName)},</p>
    <p>Thank you for sponsoring <strong>${escapeHtml(params.event.title)}</strong>. Your support makes this
       gathering possible for our community. Our team will reach out soon about your sponsor recognition.</p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%; margin:20px 0;">
      ${renderField("Sponsor", escapeHtml(sponsorName))}
      ${renderField("Level", escapeHtml(params.tierName))}
      ${eventRows(params.event)}
      ${renderField("Amount", formatUsd(params.amountCents))}
      ${renderField("Paid", escapeHtml(formatPaidAt(params.completedAt)))}
      ${renderField("Transaction ID", escapeHtml(params.captureId))}
      ${renderField("Received by", escapeHtml(site.legalName))}
    </table>
    ${helpLine()}
    <div style="margin-top:20px; border-top:1px solid ${BRAND.outline}; padding-top:16px; font-size:12px; color:${BRAND.inkVariant}; line-height:1.6;">
      ${escapeHtml(site.legalName)} is a tax-exempt organization under Section 501(c)(3) of the Internal Revenue
      Code (EIN ${escapeHtml(donationContent.ein)}). If your sponsorship includes event seats or other benefits,
      only the amount that is more than their fair market value may be tax deductible. We will send a written
      acknowledgment that lists any benefits provided. Please keep this email for your records.
    </div>`;

  await resend.emails.send({
    from,
    to: params.email,
    subject: `Thank you for sponsoring ${params.event.title}`,
    html: renderEmailShell(body),
  });
}

interface StaffPaymentParams {
  event: EventRow;
  kind: "ticket" | "sponsorship";
  name: string;
  email: string;
  organization?: string | null;
  tierName?: string | null;
  quantity?: number | null;
  amountCents: number;
  captureId: string;
  attention?: string | null;
  /** Replaces "Ticket sale" / "New sponsor" in the subject, for alerts. */
  subjectPrefix?: string;
}

export async function notifyStaffOfEventPayment(params: StaffPaymentParams): Promise<void> {
  const resend = getResendClient();
  const from = process.env.RESEND_FROM_EMAIL;
  const staffTo = process.env.RESEND_STAFF_NOTIFY_TO?.split(",").map((s) => s.trim()).filter(Boolean);
  if (!resend || !from || !staffTo?.length) return;

  const what =
    params.kind === "ticket"
      ? `${params.quantity ?? 1} seat${params.quantity === 1 ? "" : "s"}`
      : `${params.tierName ?? "Sponsorship"} sponsorship`;

  const body = `
    <p style="margin-top:0;"><strong>${escapeHtml(params.name)}</strong> ${params.subjectPrefix ? "started a payment of" : "paid"} ${formatUsd(params.amountCents)} for
       ${escapeHtml(what)} at <strong>${escapeHtml(params.event.title)}</strong>.</p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%; margin:16px 0;">
      ${params.organization ? renderField("Organization", escapeHtml(params.organization)) : ""}
      ${renderField("Email", escapeHtml(params.email))}
      ${renderField("Transaction ID", escapeHtml(params.captureId))}
    </table>
    ${
      params.attention
        ? `<p style="color:#b3261e;"><strong>Needs attention:</strong> ${escapeHtml(params.attention)}</p>`
        : ""
    }`;

  await resend.emails.send({
    from,
    to: staffTo,
    subject: `${params.subjectPrefix ?? (params.kind === "ticket" ? "Ticket sale" : "New sponsor")}: ${formatUsd(params.amountCents)} for ${params.event.title}`,
    html: renderEmailShell(body),
  });
}
