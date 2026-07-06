import { createHash } from "node:crypto";

/** Never store raw IPs — only this salted hash, used solely for rate-limit lookups. */
export function hashIp(ip: string): string {
  const salt = process.env.IP_HASH_SALT ?? "rap-usvi";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}

export function getClientIp(request: Request): string {
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
