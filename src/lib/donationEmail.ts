import { site, donation as donationContent } from "@/lib/content";
import { formatUsd } from "@/lib/donations";
import { BRAND, escapeHtml, getResendClient, renderEmailShell, renderField } from "@/lib/email";
import { createServiceRoleClient } from "@/lib/supabase/server";

interface ReceiptParams {
  email: string;
  donorName: string;
  amountCents: number;
  dedication: string | null;
  captureId: string;
  completedAt: string;
}

const PLACEHOLDER_PATTERN = /\{\{\s*([a-z_]+)\s*\}\}/gi;

/** Substitutes `{{placeholder}}` tokens in an admin-uploaded template. All values are HTML-escaped first. */
function fillTemplate(html: string, values: Record<string, string>): string {
  return html.replace(PLACEHOLDER_PATTERN, (match, key: string) => {
    const value = values[key.toLowerCase()];
    return value !== undefined ? value : match;
  });
}

function legalReceiptBlock(): string {
  return `
    <div style="margin-top:20px; border-top:1px solid ${BRAND.outline}; padding-top:16px; font-size:12px; color:${BRAND.inkVariant}; line-height:1.6;">
      No goods or services were provided in exchange for this contribution. This letter serves as your
      official receipt; please retain it for your tax records. ${escapeHtml(site.legalName)} is a tax-exempt
      organization under Section 501(c)(3) of the Internal Revenue Code (EIN ${escapeHtml(donationContent.ein)}).
      Contributions are tax-deductible to the extent allowed by law.
    </div>`;
}

function defaultReceiptHtml(params: ReceiptParams, formattedDate: string): string {
  const body = `
    <div style="display:inline-block; background-color:${BRAND.gold}; color:${BRAND.primary}; font-size:12px; font-weight:bold; text-transform:uppercase; letter-spacing:0.04em; padding:4px 12px; border-radius:999px; margin-bottom:16px;">
      Official Donation Receipt
    </div>
    <p style="margin-top:0;">Hi ${escapeHtml(params.donorName)},</p>
    <p>Thank you for your generous gift to ${escapeHtml(site.name)}. Your support helps restore the promise
       of our paradise for every community across the U.S. Virgin Islands.</p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%; margin:20px 0;">
      ${renderField("Amount", formatUsd(params.amountCents))}
      ${renderField("Date", formattedDate)}
      ${renderField("Payment method", "PayPal")}
      ${renderField("Transaction ID", escapeHtml(params.captureId))}
      ${renderField("Received by", escapeHtml(site.legalName))}
      ${params.dedication ? renderField("Dedication", escapeHtml(params.dedication)) : ""}
    </table>
    ${legalReceiptBlock()}`;

  return renderEmailShell(body);
}

/** Reads the admin-uploaded receipt template, if any; falls back to the built-in default otherwise. */
async function resolveTemplate(): Promise<{ subject: string; htmlBody: string } | null> {
  try {
    const supabase = createServiceRoleClient();
    const { data } = await supabase
      .from("donation_receipt_template")
      .select("subject, html_body")
      .eq("id", 1)
      .maybeSingle();
    if (data?.subject && data?.html_body) {
      return { subject: data.subject, htmlBody: data.html_body };
    }
  } catch (err) {
    console.error("Failed to load donation receipt template, using default", err);
  }
  return null;
}

export async function sendDonationReceiptEmail(params: ReceiptParams): Promise<void> {
  const resend = getResendClient();
  const from = process.env.RESEND_FROM_EMAIL;
  if (!resend || !from) {
    throw new Error("Resend is not fully configured (RESEND_API_KEY / RESEND_FROM_EMAIL)");
  }

  const formattedDate = new Date(params.completedAt).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/St_Thomas",
  });

  const customTemplate = await resolveTemplate();

  let subject: string;
  let html: string;

  if (customTemplate) {
    const values: Record<string, string> = {
      donor_name: escapeHtml(params.donorName),
      amount: formatUsd(params.amountCents),
      date: `${formattedDate} AST`,
      transaction_id: escapeHtml(params.captureId),
      dedication: params.dedication ? escapeHtml(params.dedication) : "",
      legal_name: escapeHtml(site.legalName),
      ein: escapeHtml(donationContent.ein),
    };
    subject = fillTemplate(customTemplate.subject, values);
    html = fillTemplate(customTemplate.htmlBody, values);
  } else {
    subject = `Your donation receipt — ${site.name}`;
    html = defaultReceiptHtml(params, `${formattedDate} AST`);
  }

  await resend.emails.send({ from, to: params.email, subject, html });

  const staffTo = process.env.RESEND_STAFF_NOTIFY_TO?.split(",").map((s) => s.trim());
  if (staffTo?.length) {
    try {
      await resend.emails.send({
        from,
        to: staffTo,
        subject: `New donation received: ${formatUsd(params.amountCents)}`,
        html: renderEmailShell(
          `<p style="margin-top:0;">${escapeHtml(params.donorName)} gave ${formatUsd(params.amountCents)} via PayPal.</p>
           <p style="font-size:13px; color:${BRAND.inkVariant};">Transaction ID: ${escapeHtml(params.captureId)}</p>`
        ),
      });
    } catch (err) {
      console.error("Donation completed but staff notification failed", err);
    }
  }
}
