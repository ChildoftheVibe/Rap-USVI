import Link from "next/link";
import type { Metadata } from "next";
import { createServiceRoleClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Email Templates | Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2";

export default async function AdminTemplatesPage() {
  const supabase = createServiceRoleClient();
  const { data: templates, error } = await supabase
    .from("email_templates")
    .select("*")
    .order("updated_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-[family-name:var(--font-headline)] text-2xl text-on-surface">Email Templates</h1>
        <Link
          href="/admin/templates/new"
          className={`rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 ${FOCUS_RING}`}
        >
          New Template
        </Link>
      </div>

      {error && (
        <p role="alert" className="text-error">
          Failed to load templates.
        </p>
      )}

      {!error && (!templates || templates.length === 0) && (
        <p className="text-on-surface-variant">No templates yet. Create one to start sending campaigns.</p>
      )}

      {!error && templates && templates.length > 0 && (
        <ul className="divide-y divide-outline-variant rounded-lg border border-outline-variant bg-surface-container-lowest">
          {templates.map((template) => (
            <li key={template.id}>
              <Link
                href={`/admin/templates/${template.id}`}
                className={`flex items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-surface-container-low ${FOCUS_RING} focus-visible:ring-inset`}
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{template.name}</p>
                  <p className="truncate text-sm text-on-surface-variant">{template.subject}</p>
                </div>
                <span className="whitespace-nowrap text-xs text-on-surface-variant">
                  {new Date(template.updated_at).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
