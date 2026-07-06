import Link from "next/link";
import type { Metadata } from "next";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { interestAreas, type InterestArea } from "@/lib/content";

export const metadata: Metadata = {
  title: "Overview | Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

async function getCounts() {
  const supabase = createServiceRoleClient();

  const [newsletterCount, ...interestCounts] = await Promise.all([
    supabase.from("newsletter_signups").select("id", { count: "exact", head: true }),
    ...interestAreas.map((area) =>
      supabase.from("inquiries").select("id", { count: "exact", head: true }).eq("interest_area", area.value)
    ),
  ]);

  const newStatusCount = await supabase
    .from("inquiries")
    .select("id", { count: "exact", head: true })
    .eq("status", "new");

  const upcomingEventsCount = await supabase
    .from("events")
    .select("id", { count: "exact", head: true })
    .eq("status", "published")
    .gte("end_at", new Date().toISOString());

  return {
    newsletter: newsletterCount.count ?? 0,
    newInquiries: newStatusCount.count ?? 0,
    upcomingEvents: upcomingEventsCount.count ?? 0,
    byInterest: interestAreas.map((area, i) => ({
      ...area,
      count: interestCounts[i].count ?? 0,
    })),
  };
}

export default async function AdminOverviewPage() {
  const counts = await getCounts();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-[family-name:var(--font-headline)] text-2xl text-on-surface">Overview</h1>
        <p className="mt-1 text-on-surface-variant">
          {counts.newInquiries} inquir{counts.newInquiries === 1 ? "y" : "ies"} awaiting review.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/admin/events"
          className="rounded-lg border border-outline-variant bg-surface-container-lowest p-6 transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          <p className="text-sm font-medium uppercase tracking-wide text-on-surface-variant">Upcoming Events</p>
          <p className="mt-2 text-3xl font-semibold text-primary">{counts.upcomingEvents}</p>
        </Link>

        <Link
          href="/admin/newsletter"
          className="rounded-lg border border-outline-variant bg-surface-container-lowest p-6 transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          <p className="text-sm font-medium uppercase tracking-wide text-on-surface-variant">Newsletter Sign-ups</p>
          <p className="mt-2 text-3xl font-semibold text-primary">{counts.newsletter}</p>
        </Link>

        {counts.byInterest.map((area) => (
          <Link
            key={area.value}
            href={`/admin/inquiries?interest=${area.value}` as `/admin/inquiries?interest=${InterestArea}`}
            className="rounded-lg border border-outline-variant bg-surface-container-lowest p-6 transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <p className="text-sm font-medium uppercase tracking-wide text-on-surface-variant">{area.label}</p>
            <p className="mt-2 text-3xl font-semibold text-primary">{area.count}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
