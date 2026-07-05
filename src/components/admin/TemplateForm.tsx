"use client";

import { useRef, useState, useTransition } from "react";
import { createTemplate, deleteTemplate, updateTemplate } from "@/app/admin/templates/actions";

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2";
const FIELD_CLASS =
  "w-full rounded-sm border border-outline-variant bg-surface px-4 py-2.5 outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary";

interface TemplateFormProps {
  mode: "new" | "edit";
  templateId?: string;
  initialName?: string;
  initialSubject?: string;
  initialHtmlBody?: string;
}

export function TemplateForm({
  mode,
  templateId,
  initialName = "",
  initialSubject = "",
  initialHtmlBody = "",
}: TemplateFormProps) {
  const [name, setName] = useState(initialName);
  const [subject, setSubject] = useState(initialSubject);
  const [htmlBody, setHtmlBody] = useState(initialHtmlBody);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setHtmlBody(String(reader.result ?? ""));
    reader.readAsText(file);
    e.target.value = "";
  }

  function handleSave() {
    setError("");
    setSaved(false);
    startTransition(async () => {
      try {
        if (mode === "new") {
          await createTemplate({ name, subject, htmlBody });
        } else if (templateId) {
          await updateTemplate(templateId, { name, subject, htmlBody });
          setSaved(true);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  function handleDelete() {
    if (!templateId) return;
    if (!window.confirm("Delete this template? This can't be undone.")) return;
    setError("");
    startTransition(async () => {
      try {
        await deleteTemplate(templateId);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="space-y-4">
        <div>
          <label htmlFor="tpl-name" className="mb-2 block text-sm font-medium text-on-surface-variant">
            NAME
          </label>
          <input id="tpl-name" value={name} onChange={(e) => setName(e.target.value)} className={FIELD_CLASS} />
        </div>

        <div>
          <label htmlFor="tpl-subject" className="mb-2 block text-sm font-medium text-on-surface-variant">
            SUBJECT
          </label>
          <input
            id="tpl-subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className={FIELD_CLASS}
          />
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <label htmlFor="tpl-html" className="block text-sm font-medium text-on-surface-variant">
              HTML CONTENT
            </label>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={`rounded-sm border border-outline-variant px-3 py-1 text-xs font-medium text-on-surface-variant transition-colors hover:border-primary hover:text-primary ${FOCUS_RING}`}
            >
              Upload .html file
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".html,.htm,text/html"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>
          <textarea
            id="tpl-html"
            value={htmlBody}
            onChange={(e) => setHtmlBody(e.target.value)}
            rows={16}
            spellCheck={false}
            className={`${FIELD_CLASS} font-mono text-xs`}
          />
          <p className="mt-1 text-xs text-on-surface-variant">
            Include <code className="rounded bg-surface-container px-1">{"{{unsubscribe_url}}"}</code> anywhere you
            want the unsubscribe link to appear — otherwise it&apos;s added automatically at send time.
          </p>
        </div>

        {error && (
          <p role="alert" className="text-sm text-error">
            {error}
          </p>
        )}
        {saved && !error && <p className="text-sm text-secondary">Saved.</p>}

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending || !name || !subject || !htmlBody}
            className={`rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50 ${FOCUS_RING}`}
          >
            {isPending ? "Saving…" : "Save template"}
          </button>
          {mode === "edit" && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={isPending}
              className={`rounded-lg border border-error px-5 py-2.5 text-sm font-medium text-error transition-colors hover:bg-error hover:text-white disabled:opacity-50 ${FOCUS_RING}`}
            >
              Delete
            </button>
          )}
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-on-surface-variant">LIVE PREVIEW</p>
        <iframe
          title="Template preview"
          srcDoc={htmlBody || "<p style='font-family:sans-serif;color:#888;padding:16px'>Nothing to preview yet.</p>"}
          sandbox=""
          className="h-[560px] w-full rounded-lg border border-outline-variant bg-white"
        />
      </div>
    </div>
  );
}
