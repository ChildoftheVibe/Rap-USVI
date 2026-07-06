"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { sendCampaign, type SendCampaignResult } from "@/app/admin/send/actions";
import type { Recipient, RecipientSource } from "@/lib/recipients";

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2";

interface TemplateOption {
  id: string;
  name: string;
  subject: string;
}

interface SendCampaignFormProps {
  templates: TemplateOption[];
  recipients: Recipient[];
  sourceLabels: Record<RecipientSource, string>;
  sourceOrder: RecipientSource[];
}

export function SendCampaignForm({ templates, recipients, sourceLabels, sourceOrder }: SendCampaignFormProps) {
  const [templateId, setTemplateId] = useState("");
  const [subject, setSubject] = useState("");
  const [filterText, setFilterText] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");
  const [result, setResult] = useState<SendCampaignResult | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = filterText.trim().toLowerCase();
    if (!q) return recipients;
    return recipients.filter(
      (r) => r.email.toLowerCase().includes(q) || (r.name?.toLowerCase().includes(q) ?? false)
    );
  }, [recipients, filterText]);

  function toggleOne(email: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(email)) next.delete(email);
      else next.add(email);
      return next;
    });
  }

  function selectSource(source: RecipientSource) {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const r of recipients) {
        if (!r.unsubscribed && r.sources.includes(source)) next.add(r.email);
      }
      return next;
    });
  }

  function selectAllFiltered() {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const r of filtered) {
        if (!r.unsubscribed) next.add(r.email);
      }
      return next;
    });
  }

  function clearSelection() {
    setSelected(new Set());
  }

  function handleTemplateChange(id: string) {
    setTemplateId(id);
    const template = templates.find((t) => t.id === id);
    if (template) setSubject(template.subject);
  }

  function handleSend() {
    setError("");
    setResult(null);
    if (!templateId) {
      setError("Choose a template first.");
      return;
    }
    if (selected.size === 0) {
      setError("Select at least one recipient.");
      return;
    }
    if (
      !window.confirm(
        `Send "${subject}" to ${selected.size} recipient${selected.size === 1 ? "" : "s"}? This can't be undone.`
      )
    ) {
      return;
    }
    startTransition(async () => {
      try {
        const res = await sendCampaign(templateId, subject, Array.from(selected));
        setResult(res);
        setSelected(new Set());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to send campaign");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="send-template" className="mb-2 block text-sm font-medium text-on-surface-variant">
            TEMPLATE
          </label>
          <select
            id="send-template"
            value={templateId}
            onChange={(e) => handleTemplateChange(e.target.value)}
            className="w-full rounded-sm border border-outline-variant bg-surface px-4 py-2.5 outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary"
          >
            <option value="">Choose a template…</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="send-subject" className="mb-2 block text-sm font-medium text-on-surface-variant">
            SUBJECT
          </label>
          <input
            id="send-subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full rounded-sm border border-outline-variant bg-surface px-4 py-2.5 outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <label htmlFor="recipient-filter" className="sr-only">
            Filter recipients
          </label>
          <input
            id="recipient-filter"
            type="search"
            placeholder="Filter by name or email…"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            className="w-full max-w-xs rounded-sm border border-outline-variant bg-surface px-4 py-2 text-sm outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary"
          />
          <span className="text-sm text-on-surface-variant">
            {selected.size} of {recipients.length} selected
          </span>
        </div>

        <div className="mb-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={selectAllFiltered}
            className={`rounded-full border border-outline-variant px-3 py-1 text-xs font-medium text-on-surface-variant transition-colors hover:border-primary hover:text-primary ${FOCUS_RING}`}
          >
            Select all shown
          </button>
          <button
            type="button"
            onClick={clearSelection}
            className={`rounded-full border border-outline-variant px-3 py-1 text-xs font-medium text-on-surface-variant transition-colors hover:border-primary hover:text-primary ${FOCUS_RING}`}
          >
            Clear
          </button>
          {sourceOrder.map((source) => (
            <button
              key={source}
              type="button"
              onClick={() => selectSource(source)}
              className={`rounded-full border border-outline-variant px-3 py-1 text-xs font-medium text-on-surface-variant transition-colors hover:border-primary hover:text-primary ${FOCUS_RING}`}
            >
              + {sourceLabels[source]}
            </button>
          ))}
        </div>

        <div className="max-h-[420px] overflow-y-auto rounded-lg border border-outline-variant bg-surface-container-lowest">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Bulk email recipients</caption>
            <thead className="sticky top-0 border-b border-outline-variant bg-surface-container-lowest text-xs uppercase tracking-wide text-on-surface-variant">
              <tr>
                <th scope="col" className="w-10 px-4 py-2">
                  <span className="sr-only">Select</span>
                </th>
                <th scope="col" className="px-2 py-2 font-medium">
                  Email
                </th>
                <th scope="col" className="px-2 py-2 font-medium">
                  Name
                </th>
                <th scope="col" className="px-2 py-2 font-medium">
                  Sources
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr
                  key={r.email}
                  className={`border-b border-outline-variant last:border-0 ${r.unsubscribed ? "opacity-50" : ""}`}
                >
                  <td className="px-4 py-2">
                    <input
                      type="checkbox"
                      aria-label={`Select ${r.email}`}
                      checked={selected.has(r.email)}
                      disabled={r.unsubscribed}
                      onChange={() => toggleOne(r.email)}
                      className={`h-4 w-4 rounded-sm border-outline-variant text-primary ${FOCUS_RING}`}
                    />
                  </td>
                  <td className="px-2 py-2">
                    {r.email}
                    {r.unsubscribed && <span className="ml-2 text-xs text-error">Unsubscribed</span>}
                  </td>
                  <td className="px-2 py-2 text-on-surface-variant">{r.name ?? "—"}</td>
                  <td className="px-2 py-2 text-on-surface-variant">
                    {r.sources.map((s) => sourceLabels[s]).join(", ")}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-on-surface-variant">
                    No recipients match.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {error && (
        <p role="alert" className="text-sm text-error">
          {error}
        </p>
      )}

      {result && (
        <p className="text-sm text-secondary">
          Sent to {result.sent}, failed {result.failed}, skipped (unsubscribed) {result.skipped}.{" "}
          <Link href={`/admin/send/${result.sendId}`} className={`text-primary underline ${FOCUS_RING}`}>
            View details
          </Link>
        </p>
      )}

      <button
        type="button"
        onClick={handleSend}
        disabled={isPending}
        className={`rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50 ${FOCUS_RING}`}
      >
        {isPending ? "Sending…" : "Send campaign"}
      </button>
    </div>
  );
}
