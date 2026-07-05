import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { TemplateForm } from "@/components/admin/TemplateForm";

export const metadata: Metadata = {
  title: "Edit Template | Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function EditTemplatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createServiceRoleClient();
  const { data: template } = await supabase.from("email_templates").select("*").eq("id", id).maybeSingle();

  if (!template) notFound();

  return (
    <div className="space-y-6">
      <h1 className="font-[family-name:var(--font-headline)] text-2xl text-on-surface">Edit Template</h1>
      <TemplateForm
        mode="edit"
        templateId={template.id}
        initialName={template.name}
        initialSubject={template.subject}
        initialHtmlBody={template.html_body}
      />
    </div>
  );
}
