import Link from "next/link";
import type { Metadata } from "next";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { ReceiptTemplateForm } from "@/components/admin/ReceiptTemplateForm";

export const metadata: Metadata = {
  title: "Donation Receipt Template | Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2";

export default async function DonationReceiptTemplatePage() {
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("donation_receipt_template")
    .select("subject, html_body")
    .eq("id", 1)
    .maybeSingle();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/donations" className={`text-sm text-primary hover:underline ${FOCUS_RING}`}>
          ← Back to donations
        </Link>
        <h1 className="mt-1 font-[family-name:var(--font-headline)] text-2xl text-on-surface">
          Donation Receipt Template
        </h1>
      </div>

      <ReceiptTemplateForm
        initialSubject={data?.subject ?? ""}
        initialHtmlBody={data?.html_body ?? ""}
        hasCustomTemplate={!!(data?.subject && data?.html_body)}
      />
    </div>
  );
}
