import { createHmac, timingSafeEqual } from "node:crypto";
import { site } from "@/lib/content";

function getSecret(): string {
  return process.env.EMAIL_UNSUBSCRIBE_SECRET ?? "dev-unsubscribe-secret-change-in-production";
}

function sign(email: string): string {
  return createHmac("sha256", getSecret()).update(email.trim().toLowerCase()).digest("hex");
}

/** Deterministic per-email token — no DB lookup needed to verify a click. */
export function unsubscribeToken(email: string): string {
  return sign(email);
}

export function verifyUnsubscribeToken(email: string, token: string): boolean {
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
