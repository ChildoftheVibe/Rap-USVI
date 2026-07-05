import { Resend } from "resend";
import { unsubscribeUrl } from "@/lib/unsubscribe";

// Resend's batch endpoint caps at 100 emails per request.
const BATCH_SIZE = 100;

/**
 * Every campaign send must carry a working unsubscribe link (CAN-SPAM). If the
 * admin's template includes a `{{unsubscribe_url}}` placeholder we fill it in;
 * otherwise we append a plain footer so compliance never depends on the admin
 * remembering to add one.
 *
 * Note: this is called once per recipient in a batch loop, so each call builds
 * its own RegExp rather than reusing a shared `/g` instance — a shared global
 * regex's `.test()`/`.replace()` calls mutate `lastIndex` across calls and can
 * silently miss matches on later recipients.
 */
export function injectUnsubscribeLink(html: string, url: string): string {
  if (/\{\{\s*unsubscribe_url\s*\}\}/i.test(html)) {
    return html.replace(/\{\{\s*unsubscribe_url\s*\}\}/gi, url);
  }

  const footer = `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;">
  <tr>
    <td style="padding:16px 8px; text-align:center; font-size:12px; color:#737784; font-family:Arial, Helvetica, sans-serif;">
      <a href="${url}" style="color:#737784; text-decoration:underline;">Unsubscribe</a> from these emails.
    </td>
  </tr>
</table>`;

  const closeBodyIndex = html.search(/<\/body>/i);
  if (closeBodyIndex !== -1) {
    return html.slice(0, closeBodyIndex) + footer + html.slice(closeBodyIndex);
  }
  return html + footer;
}

function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  return new Resend(apiKey);
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

export interface CampaignSendResult {
  email: string;
  status: "sent" | "failed";
  error?: string;
}

/** Sends one campaign to many recipients via Resend's batch API, chunked to its 100-per-request limit. */
export async function sendCampaignBatches(
  recipients: string[],
  subject: string,
  html: string
): Promise<CampaignSendResult[]> {
  const resend = getResendClient();
  const from = process.env.RESEND_FROM_EMAIL;
  if (!resend || !from) {
    throw new Error("Resend is not fully configured (RESEND_API_KEY / RESEND_FROM_EMAIL)");
  }

  const results: CampaignSendResult[] = [];

  for (const batch of chunk(recipients, BATCH_SIZE)) {
    try {
      const { error } = await resend.batch.send(
        batch.map((email) => {
          const unsubUrl = unsubscribeUrl(email);
          return {
            from,
            to: email,
            subject,
            html: injectUnsubscribeLink(html, unsubUrl),
            headers: {
              "List-Unsubscribe": `<${unsubUrl}>`,
              "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
            },
          };
        })
      );

      if (error) {
        for (const email of batch) results.push({ email, status: "failed", error: error.message });
      } else {
        for (const email of batch) results.push({ email, status: "sent" });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      for (const email of batch) results.push({ email, status: "failed", error: message });
    }
  }

  return results;
}
