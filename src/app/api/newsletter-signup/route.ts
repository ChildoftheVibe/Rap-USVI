import { NextResponse } from "next/server";
import { newsletterSignupSchema } from "@/lib/validation/newsletter";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { isRateLimited } from "@/lib/ratelimit";
import { getClientIp, hashIp, isHoneypotTripped } from "@/lib/requestMeta";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  // Honeypot: silently accept-and-drop so bots don't learn they were caught.
  if (isHoneypotTripped(body)) {
    return NextResponse.json({ success: true });
  }

  const parsed = newsletterSignupSchema.safeParse(body);
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

  const limited = await isRateLimited(supabase, ipHash, "newsletter_signups");
  if (limited) {
    return NextResponse.json({ error: "Too many submissions, please try again later" }, { status: 429 });
  }

  const turnstileOk = await verifyTurnstileToken(input.turnstileToken, ip);
  if (!turnstileOk) {
    return NextResponse.json({ error: "Verification failed" }, { status: 403 });
  }

  const { error: insertError } = await supabase.from("newsletter_signups").insert({
    email: input.email,
    source_page: "join_movement_modal",
    ip_hash: ipHash,
    user_agent: request.headers.get("user-agent"),
    turnstile_verified: true,
  });

  // Unique violation just means they already signed up — treat as success.
  if (insertError && insertError.code !== "23505") {
    console.error("Failed to insert newsletter signup", insertError);
    return NextResponse.json({ error: "Something went wrong, please try again" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
