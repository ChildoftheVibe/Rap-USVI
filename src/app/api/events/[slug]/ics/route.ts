import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { buildEventIcs } from "@/lib/eventIcs";
import { slugify } from "@/lib/events";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = createServiceRoleClient();
  const { data: event } = await supabase
    .from("events")
    .select("id, slug, title, description, start_at, end_at, location_name, location_address, status")
    .eq("slug", slug)
    .maybeSingle();

  if (!event || event.status !== "published") {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const ics = buildEventIcs(event);
  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${slugify(event.title)}.ics"`,
    },
  });
}
