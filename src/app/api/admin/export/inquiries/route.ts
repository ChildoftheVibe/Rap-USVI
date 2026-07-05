import { NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceRoleClient } from "@/lib/supabase/server";
import { toCsv, csvFilename } from "@/lib/csv";
import { interestAreas } from "@/lib/content";

const INTEREST_VALUES = interestAreas.map((a) => a.value);

export async function GET(request: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const interest = searchParams.get("interest");
  const activeInterest = interest && (INTEREST_VALUES as string[]).includes(interest) ? interest : undefined;

  const serviceRole = createServiceRoleClient();
  let query = serviceRole
    .from("inquiries")
    .select("created_at, full_name, email, interest_area, message, status")
    .order("created_at", { ascending: false });
  if (activeInterest) {
    query = query.eq("interest_area", activeInterest);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: "Failed to export inquiries" }, { status: 500 });
  }

  const csv = toCsv(data ?? [], ["created_at", "full_name", "email", "interest_area", "message", "status"]);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${csvFilename(activeInterest ? `inquiries-${activeInterest}` : "inquiries")}"`,
    },
  });
}
