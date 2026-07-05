"use client";

import { useTransition } from "react";
import { updateInquiryStatus } from "@/app/admin/actions";

const STATUS_OPTIONS = ["new", "reviewed", "archived"] as const;

const STATUS_STYLES: Record<(typeof STATUS_OPTIONS)[number], string> = {
  new: "border-primary text-primary",
  reviewed: "border-secondary text-secondary",
  archived: "border-outline text-on-surface-variant",
};

export function StatusSelect({ id, status, name }: { id: string; status: string; name: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <select
      value={status}
      disabled={isPending}
      aria-label={`Status for inquiry from ${name}`}
      onChange={(e) => {
        const next = e.target.value;
        startTransition(() => {
          updateInquiryStatus(id, next);
        });
      }}
      className={`rounded-sm border bg-surface px-2 py-1 text-sm font-medium capitalize focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50 ${
        STATUS_STYLES[status as (typeof STATUS_OPTIONS)[number]] ?? "border-outline-variant"
      }`}
    >
      {STATUS_OPTIONS.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}
