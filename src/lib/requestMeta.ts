import { createHash } from "node:crypto";

/**
 * Fails closed in production. The fallback salt below is a public constant —
 * with it, every stored ip_hash is reversible by brute force (the whole IPv4
 * space is only 2^32 hashes), which would defeat the point of hashing.
 */
function getSalt(): string {
  const salt = process.env.IP_HASH_SALT;
  if (salt) return salt;

  if (process.env.NODE_ENV === "production") {
    throw new Error("IP_HASH_SALT is not configured — refusing to hash IPs with a public default salt.");
  }
  return "rap-usvi";
}

/** Never store raw IPs — only this salted hash, used solely for rate-limit lookups. */
export function hashIp(ip: string): string {
  return createHash("sha256").update(`${getSalt()}:${ip}`).digest("hex");
}

/**
 * Resolves the client IP from headers the hosting platform sets itself.
 *
 * `x-forwarded-for` is only trustworthy at the position the edge appends; its
 * leftmost entry is whatever the client claimed. Preferring the
 * platform-controlled headers means a caller can't rotate a spoofed
 * `x-forwarded-for` to reset their rate-limit bucket. XFF stays as a last
 * resort for local dev and non-Vercel hosts.
 */
export function getClientIp(request: Request): string {
  const vercelForwarded = request.headers.get("x-vercel-forwarded-for");
  if (vercelForwarded) return vercelForwarded.split(",")[0]!.trim();

  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  const forwardedFor = request.headers.get("x-forwarded-for");
  return forwardedFor?.split(",")[0]?.trim() || "0.0.0.0";
}

/** True if a JSON body's honeypot field was filled in (i.e. it's a bot). Real users never see or fill this field. */
export function isHoneypotTripped(body: unknown): boolean {
  return (
    typeof body === "object" &&
    body !== null &&
    "company" in body &&
    typeof (body as { company?: unknown }).company === "string" &&
    (body as { company: string }).company.length > 0
  );
}
