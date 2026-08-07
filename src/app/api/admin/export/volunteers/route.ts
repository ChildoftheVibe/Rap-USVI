import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { getAdminUserOrNull } from "@/lib/adminAuth";
import { toCsv, csvFilename } from "@/lib/csv";

const STATUS_VALUES = ["new", "contacted", "active", "inactive"] as const;

export async function GET(request: Request) {
  const user = await getAdminUserOrNull();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const activeStatus = status && (STATUS_VALUES as readonly string[]).includes(status) ? status : undefined;

  const serviceRole = createServiceRoleClient();
  let query = serviceRole
    .from("volunteers")
    .select(
      "created_at, full_name, email, phone, industry, availability_days, availability_hours, commitment_level, certifications, skills_experience, status"
    )
    .order("created_at", { ascending: false });
  if (activeStatus) {
    query = query.eq("status", activeStatus);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: "Failed to export volunteers" }, { status: 500 });
  }

  const rows = (data ?? []).map((row) => ({
    ...row,
    availability_days: (row.availability_days ?? []).join("; "),
    certifications: (row.certifications ?? []).join("; "),
  }));

  const csv = toCsv(rows, [
    "created_at",
    "full_name",
    "email",
    "phone",
    "industry",
    "availability_days",
    "availability_hours",
    "commitment_level",
    "certifications",
    "skills_experience",
    "status",
  ]);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${csvFilename(activeStatus ? `volunteers-${activeStatus}` : "volunteers")}"`,
    },
  });
}
