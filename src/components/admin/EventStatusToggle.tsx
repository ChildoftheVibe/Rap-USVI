"use client";

import { useTransition } from "react";
import { updateEventStatus } from "@/app/admin/events/actions";
import type { EventStatus } from "@/lib/validation/event";

const OPTIONS: { value: Extract<EventStatus, "draft" | "published">; label: string }[] = [
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
];

export function EventStatusToggle({ id, status }: { id: string; status: EventStatus }) {
  const [isPending, startTransition] = useTransition();

  // Cancelled is a distinct, more consequential state — leave it settable
  // only from the full edit form rather than this quick inline toggle.
  if (status === "cancelled") {
    return (
      <span className="rounded-sm border border-error px-2 py-1 text-xs font-medium capitalize text-error">
        Cancelled
      </span>
    );
  }

  return (
    <div
      role="group"
      aria-label="Event status"
      className="inline-flex overflow-hidden rounded-full border border-outline-variant"
    >
      {OPTIONS.map((option) => {
        const active = status === option.value;
        return (
          <button
            key={option.value}
            type="button"
            disabled={isPending || active}
            aria-pressed={active}
            onClick={() => startTransition(() => updateEventStatus(id, option.value))}
            className={`px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-default ${
              active ? "bg-primary text-white" : "text-on-surface-variant hover:bg-surface-container-lowest"
            } ${isPending ? "opacity-50" : ""}`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
