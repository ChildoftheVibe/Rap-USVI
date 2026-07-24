import { NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceRoleClient } from "@/lib/supabase/server";
import { toCsv, csvFilename } from "@/lib/csv";
import type { DonationStatus } from "@/lib/donations";

const STATUS_VALUES: DonationStatus[] = ["pending", "completed", "failed", "refunded"];

export async function GET(request: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const activeStatus = status && (STATUS_VALUES as string[]).includes(status) ? status : undefined;

  const serviceRole = createServiceRoleClient();
  let query = serviceRole
    .from("donations")
    .select(
      "created_at, donor_name, donor_email, payer_email, amount_cents, currency, status, dedication, paypal_order_id, paypal_capture_id, completed_at, refunded_at"
    )
    .order("created_at", { ascending: false });
  if (activeStatus) {
    query = query.eq("status", activeStatus);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: "Failed to export donations" }, { status: 500 });
  }

  const csv = toCsv(data ?? [], [
    "created_at",
    "donor_name",
    "donor_email",
    "payer_email",
    "amount_cents",
    "currency",
    "status",
    "dedication",
    "paypal_order_id",
    "paypal_capture_id",
    "completed_at",
    "refunded_at",
  ]);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${csvFilename(activeStatus ? `donations-${activeStatus}` : "donations")}"`,
    },
  });
}
