import { createHmac, timingSafeEqual } from "node:crypto";
import { site } from "@/lib/content";

/**
 * Fails closed in production. The fallback below is a public constant — if it
 * were ever used against real traffic, anyone could compute a valid token for
 * any address and unsubscribe arbitrary recipients.
 */
function getSecret(): string {
  const secret = process.env.EMAIL_UNSUBSCRIBE_SECRET;
  if (secret) return secret;

  if (process.env.NODE_ENV === "production") {
    throw new Error("EMAIL_UNSUBSCRIBE_SECRET is not configured — refusing to sign unsubscribe tokens.");
  }
  return "dev-unsubscribe-secret-change-in-production";
}

function sign(email: string): string {
  return createHmac("sha256", getSecret()).update(email.trim().toLowerCase()).digest("hex");
}

/** Deterministic per-email token — no DB lookup needed to verify a click. */
export function unsubscribeToken(email: string): string {
  return sign(email);
}

export function verifyUnsubscribeToken(email: string, token: string): boolean {
  // Buffer.from(x, "hex") silently truncates at the first non-hex character,
  // so reject anything that isn't a clean hex digest before comparing.
  if (!/^[0-9a-f]+$/i.test(token)) return false;

  const expected = sign(email);
  const expectedBuf = Buffer.from(expected, "hex");
  const tokenBuf = Buffer.from(token, "hex");
  if (expectedBuf.length !== tokenBuf.length) return false;
  return timingSafeEqual(expectedBuf, tokenBuf);
}

export function unsubscribeUrl(email: string): string {
  const params = new URLSearchParams({ email, token: unsubscribeToken(email) });
  return `${site.url}/unsubscribe?${params.toString()}`;
}
