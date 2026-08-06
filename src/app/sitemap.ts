import type { MetadataRoute } from "next";
import { site } from "@/lib/content";
import { createServiceRoleClient } from "@/lib/supabase/server";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const routes = ["", "/privacy", "/terms", "/accessibility", "/events", "/donate", "/donation-policy"];
  const staticEntries = routes.map((route) => ({
    url: `${site.url}${route}`,
    lastModified: new Date(),
  }));

  let eventEntries: MetadataRoute.Sitemap = [];
  try {
    const supabase = createServiceRoleClient();
    const { data: events } = await supabase.from("events").select("slug, updated_at").eq("status", "published");
    eventEntries = (events ?? []).map((event) => ({
      url: `${site.url}/events/${event.slug}`,
      lastModified: new Date(event.updated_at),
    }));
  } catch (err) {
    console.error("Failed to load events for sitemap", err);
  }

  return [...staticEntries, ...eventEntries];
}
