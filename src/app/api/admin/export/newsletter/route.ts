import { NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceRoleClient } from "@/lib/supabase/server";
import { toCsv, csvFilename } from "@/lib/csv";

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const serviceRole = createServiceRoleClient();
  const { data, error } = await serviceRole
    .from("newsletter_signups")
    .select("created_at, email, source_page")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Failed to export newsletter sign-ups" }, { status: 500 });
  }

  const csv = toCsv(data ?? [], ["created_at", "email", "source_page"]);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${csvFilename("newsletter-signups")}"`,
    },
  });
}
