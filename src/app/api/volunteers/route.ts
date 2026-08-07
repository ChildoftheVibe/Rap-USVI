import { NextResponse } from "next/server";
import { volunteerSchema } from "@/lib/validation/volunteer";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { isRateLimited } from "@/lib/ratelimit";
import { sendVolunteerStaffNotification } from "@/lib/email";
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

  const parsed = volunteerSchema.safeParse(body);
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

  const limited = await isRateLimited(supabase, ipHash, "volunteers");
  if (limited) {
    return NextResponse.json({ error: "Too many submissions, please try again later" }, { status: 429 });
  }

  const turnstileOk = await verifyTurnstileToken(input.turnstileToken, ip);
  if (!turnstileOk) {
    return NextResponse.json({ error: "Verification failed" }, { status: 403 });
  }

  const { data: row, error: insertError } = await supabase
    .from("volunteers")
    .insert({
      full_name: input.fullName,
      phone: input.phone,
      email: input.email,
      industry: input.industry,
      availability_days: input.availabilityDays,
      availability_hours: input.availabilityHours,
      commitment_level: input.commitmentLevel,
      skills_experience: input.skillsExperience || null,
      certifications: input.certifications ?? [],
      source_page: "home",
      ip_hash: ipHash,
      user_agent: request.headers.get("user-agent"),
    })
    .select("id")
    .single();

  if (insertError || !row) {
    console.error("Failed to insert volunteer", insertError);
    return NextResponse.json({ error: "Something went wrong, please try again" }, { status: 500 });
  }

  try {
    await sendVolunteerStaffNotification(input);
    await supabase.from("volunteers").update({ notified_at: new Date().toISOString() }).eq("id", row.id);
  } catch (emailError) {
    console.error("Volunteer saved but notification email failed", emailError);
    await supabase
      .from("volunteers")
      .update({ notify_error: String(emailError) })
      .eq("id", row.id);
    // The submission itself succeeded — don't surface an error to the user.
  }

  return NextResponse.json({ success: true });
}
