"use client";

import { useState, useTransition } from "react";
import { cancelRsvpByToken, type CancelRsvpResult } from "@/app/(site)/events/cancel/actions";

export function CancelRsvpForm({ token }: { token: string }) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<CancelRsvpResult | null>(null);

  function handleCancel() {
    startTransition(async () => {
      const res = await cancelRsvpByToken(token);
      setResult(res);
    });
  }

  if (result) {
    return (
      <p role="status" className={result.success ? "text-secondary" : "text-error"}>
        {result.message}
      </p>
    );
  }

  return (
    <button type="button" onClick={handleCancel} disabled={isPending} className="btn btn-lg btn-outline">
      {isPending ? "Cancelling…" : "Cancel my RSVP"}
    </button>
  );
}
