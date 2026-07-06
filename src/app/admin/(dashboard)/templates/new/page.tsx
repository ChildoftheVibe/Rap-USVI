import type { Metadata } from "next";
import { TemplateForm } from "@/components/admin/TemplateForm";

export const metadata: Metadata = {
  title: "New Template | Admin",
  robots: { index: false, follow: false },
};

export default function NewTemplatePage() {
  return (
    <div className="space-y-6">
      <h1 className="font-[family-name:var(--font-headline)] text-2xl text-on-surface">New Template</h1>
      <TemplateForm mode="new" />
    </div>
  );
}
