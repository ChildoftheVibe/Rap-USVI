"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { saveReceiptTemplate, resetReceiptTemplate } from "@/app/admin/donations/actions";

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2";
const FIELD_CLASS =
  "w-full rounded-sm border border-outline-variant bg-surface px-4 py-2.5 outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary";

const SAMPLE_VALUES: Record<string, string> = {
  donor_name: "Jane Doe",
  amount: "$100.00",
  date: "Jan 1, 2026, 12:00 PM AST",
  transaction_id: "1AB23456CD789012E",
  dedication: "In honor of the Philip family",
  legal_name: "Restore America's Paradise, Inc.",
  ein: "XX-XXXXXXX",
};

function fillSample(html: string): string {
  return html.replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (match, key: string) => SAMPLE_VALUES[key.toLowerCase()] ?? match);
}

interface ReceiptTemplateFormProps {
  initialSubject: string;
  initialHtmlBody: string;
  hasCustomTemplate: boolean;
}

export function ReceiptTemplateForm({ initialSubject, initialHtmlBody, hasCustomTemplate }: ReceiptTemplateFormProps) {
  const [subject, setSubject] = useState(initialSubject);
  const [htmlBody, setHtmlBody] = useState(initialHtmlBody);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const previewHtml = useMemo(() => fillSample(htmlBody), [htmlBody]);

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
        await saveReceiptTemplate({ subject, htmlBody });
        setSaved(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  function handleReset() {
    if (!window.confirm("Reset to the built-in default receipt template? Your custom template will be deleted.")) return;
    setError("");
    startTransition(async () => {
      try {
        await resetReceiptTemplate();
        setSubject("");
        setHtmlBody("");
        setSaved(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="space-y-4">
        <p className="text-sm text-on-surface-variant">
          {hasCustomTemplate
            ? "A custom receipt template is active."
            : "No custom template yet — donors currently receive the built-in default receipt."}
        </p>

        <div>
          <label htmlFor="receipt-subject" className="mb-2 block text-sm font-medium text-on-surface-variant">
            SUBJECT
          </label>
          <input
            id="receipt-subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Your donation receipt — Restore America's Paradise"
            className={FIELD_CLASS}
          />
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <label htmlFor="receipt-html" className="block text-sm font-medium text-on-surface-variant">
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
            id="receipt-html"
            value={htmlBody}
            onChange={(e) => setHtmlBody(e.target.value)}
            rows={16}
            spellCheck={false}
            className={`${FIELD_CLASS} font-mono text-xs`}
          />
          <p className="mt-1 text-xs text-on-surface-variant">
            Supported placeholders:{" "}
            {Object.keys(SAMPLE_VALUES).map((key, i) => (
              <span key={key}>
                {i > 0 && ", "}
                <code className="rounded bg-surface-container px-1">{`{{${key}}}`}</code>
              </span>
            ))}
            . Keep the 501(c)(3) / no-goods-or-services statement in your template — it&apos;s required for a
            valid tax receipt.
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
            disabled={isPending || !subject || !htmlBody}
            className={`rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50 ${FOCUS_RING}`}
          >
            {isPending ? "Saving…" : "Save template"}
          </button>
          {hasCustomTemplate && (
            <button
              type="button"
              onClick={handleReset}
              disabled={isPending}
              className={`rounded-lg border border-error px-5 py-2.5 text-sm font-medium text-error transition-colors hover:bg-error hover:text-white disabled:opacity-50 ${FOCUS_RING}`}
            >
              Reset to default
            </button>
          )}
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-on-surface-variant">LIVE PREVIEW (with sample values)</p>
        <iframe
          title="Receipt template preview"
          srcDoc={previewHtml || "<p style='font-family:sans-serif;color:#888;padding:16px'>Nothing to preview yet.</p>"}
          sandbox=""
          className="h-[560px] w-full rounded-lg border border-outline-variant bg-white"
        />
      </div>
    </div>
  );
}
