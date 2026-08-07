"use client";

import { useTransition } from "react";
import { updateVolunteerStatus } from "@/app/admin/volunteers/actions";

const STATUS_OPTIONS = ["new", "contacted", "active", "inactive"] as const;

const STATUS_STYLES: Record<(typeof STATUS_OPTIONS)[number], string> = {
  new: "border-primary text-primary",
  contacted: "border-secondary text-secondary",
  active: "border-caribbean-azure text-caribbean-azure",
  inactive: "border-outline text-on-surface-variant",
};

export function VolunteerStatusSelect({ id, status, name }: { id: string; status: string; name: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <select
      value={status}
      disabled={isPending}
      aria-label={`Status for volunteer ${name}`}
      onChange={(e) => {
        const next = e.target.value;
        startTransition(() => {
          updateVolunteerStatus(id, next);
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
