import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { inquirySchema } from "@/lib/validation/inquiry";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { isRateLimited } from "@/lib/ratelimit";
import { sendStaffNotification, sendSubmitterAutoReply } from "@/lib/email";

function hashIp(ip: string): string {
  const salt = process.env.IP_HASH_SALT ?? "rap-usvi";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}

function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  return forwardedFor?.split(",")[0]?.trim() || "0.0.0.0";
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  // Honeypot: silently accept-and-drop so bots don't learn they were caught.
  if (
    typeof body === "object" &&
    body !== null &&
    "company" in body &&
    typeof (body as { company?: unknown }).company === "string" &&
    (body as { company: string }).company.length > 0
  ) {
    return NextResponse.json({ success: true });
  }

  const parsed = inquirySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }
  const input = parsed.data;

  const ip = getClientIp(request);
  const ipHash = hashIp(ip);

  const supabase = createServiceRoleClient();

  const limited = await isRateLimited(supabase, ipHash);
  if (limited) {
    return NextResponse.json({ error: "Too many submissions, please try again later" }, { status: 429 });
  }

  const turnstileOk = await verifyTurnstileToken(input.turnstileToken, ip);
  if (!turnstileOk) {
    return NextResponse.json({ error: "Verification failed" }, { status: 403 });
  }

  const { data: row, error: insertError } = await supabase
    .from("inquiries")
    .insert({
      full_name: input.fullName,
      email: input.email,
      interest_area: input.interestArea,
      message: input.message,
      source_page: "home",
      ip_hash: ipHash,
      user_agent: request.headers.get("user-agent"),
      turnstile_verified: true,
    })
    .select("id")
    .single();

  if (insertError || !row) {
    console.error("Failed to insert inquiry", insertError);
    return NextResponse.json({ error: "Something went wrong, please try again" }, { status: 500 });
  }

  try {
    await Promise.all([sendStaffNotification(input), sendSubmitterAutoReply(input)]);
    await supabase.from("inquiries").update({ notified_at: new Date().toISOString() }).eq("id", row.id);
  } catch (emailError) {
    console.error("Inquiry saved but notification email failed", emailError);
    await supabase
      .from("inquiries")
      .update({ notify_error: String(emailError) })
      .eq("id", row.id);
    // The submission itself succeeded — don't surface an error to the user.
  }

  return NextResponse.json({ success: true });
}
