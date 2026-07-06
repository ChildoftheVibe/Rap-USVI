import { NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceRoleClient } from "@/lib/supabase/server";
import { toCsv, csvFilename } from "@/lib/csv";
import type { RsvpStatus } from "@/lib/events";

const RSVP_STATUS_VALUES: RsvpStatus[] = ["confirmed", "waitlisted", "cancelled"];

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const activeStatus = status && (RSVP_STATUS_VALUES as string[]).includes(status) ? status : undefined;

  const serviceRole = createServiceRoleClient();
  const { data: event } = await serviceRole.from("events").select("slug").eq("id", id).maybeSingle();
  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  let query = serviceRole
    .from("event_rsvps")
    .select("created_at, full_name, email, phone, guest_count, status, checked_in_at")
    .eq("event_id", id)
    .order("created_at", { ascending: false });
  if (activeStatus) {
    query = query.eq("status", activeStatus);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: "Failed to export RSVPs" }, { status: 500 });
  }

  const csv = toCsv(data ?? [], [
    "created_at",
    "full_name",
    "email",
    "phone",
    "guest_count",
    "status",
    "checked_in_at",
  ]);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${csvFilename(`rsvps-${event.slug}${activeStatus ? `-${activeStatus}` : ""}`)}"`,
    },
  });
}
