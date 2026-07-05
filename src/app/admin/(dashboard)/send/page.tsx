import Link from "next/link";
import type { Metadata } from "next";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { getRecipientDirectory, RECIPIENT_SOURCE_LABELS, type RecipientSource } from "@/lib/recipients";
import { interestAreas } from "@/lib/content";
import { SendCampaignForm } from "@/components/admin/SendCampaignForm";

export const metadata: Metadata = {
  title: "Send Campaign | Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const SOURCE_ORDER: RecipientSource[] = ["newsletter", ...interestAreas.map((a) => a.value)];

export default async function AdminSendPage() {
  const supabase = createServiceRoleClient();

  const [{ data: templates, error: templatesError }, recipients, { data: recentSends }] = await Promise.all([
    supabase.from("email_templates").select("id, name, subject").order("name", { ascending: true }),
    getRecipientDirectory(),
    supabase
      .from("email_sends")
      .select("id, template_name, subject, sent_by, recipient_count, created_at")
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-[family-name:var(--font-headline)] text-2xl text-on-surface">Send Campaign</h1>
        <p className="mt-1 text-on-surface-variant">
          Pick a saved template, choose recipients from newsletter sign-ups and stakeholder inquiries, and send.
        </p>
      </div>

      {templatesError && (
        <p role="alert" className="text-error">
          Failed to load templates.
        </p>
      )}

      {!templatesError && (!templates || templates.length === 0) && (
        <p className="text-on-surface-variant">
          No templates yet.{" "}
          <Link href="/admin/templates/new" className="text-primary underline">
            Create one
          </Link>{" "}
          before sending a campaign.
        </p>
      )}

      {!templatesError && templates && templates.length > 0 && (
        <SendCampaignForm
          templates={templates}
          recipients={recipients}
          sourceLabels={RECIPIENT_SOURCE_LABELS}
          sourceOrder={SOURCE_ORDER}
        />
      )}

      <div>
        <h2 className="mb-3 font-[family-name:var(--font-headline)] text-lg text-on-surface">Recent Campaigns</h2>
        {(!recentSends || recentSends.length === 0) && (
          <p className="text-on-surface-variant">No campaigns sent yet.</p>
        )}
        {recentSends && recentSends.length > 0 && (
          <ul className="divide-y divide-outline-variant rounded-lg border border-outline-variant bg-surface-container-lowest">
            {recentSends.map((send) => (
              <li key={send.id}>
                <Link
                  href={`/admin/send/${send.id}`}
                  className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 transition-colors hover:bg-surface-container-low focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{send.subject}</p>
                    <p className="text-sm text-on-surface-variant">
                      {send.template_name} · {send.recipient_count} recipient
                      {send.recipient_count === 1 ? "" : "s"} · {send.sent_by ?? "unknown"}
                    </p>
                  </div>
                  <span className="whitespace-nowrap text-xs text-on-surface-variant">
                    {new Date(send.created_at).toLocaleString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
