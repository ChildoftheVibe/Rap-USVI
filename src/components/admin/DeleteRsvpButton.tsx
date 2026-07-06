"use client";

import { useTransition } from "react";
import { deleteRsvp } from "@/app/admin/events/actions";

export function DeleteRsvpButton({ id, eventId, name }: { id: string; eventId: string; name: string }) {
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!window.confirm(`Delete the RSVP from ${name}? This can't be undone.`)) return;
    startTransition(() => {
      deleteRsvp(id, eventId);
    });
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={isPending}
      className="rounded-sm text-xs font-medium text-error hover:underline disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
    >
      Delete
    </button>
  );
}
