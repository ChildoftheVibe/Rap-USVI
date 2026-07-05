"use client";

import { useEffect, useState } from "react";

const OPEN_EVENT = "rap:open-join-modal";

export function openJoinModal(): void {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

export function JoinMovementModal() {
  const [open, setOpen] = useState(false);
  const embedUrl = process.env.NEXT_PUBLIC_ZEFFY_SIGNUP_EMBED_URL;

  useEffect(() => {
    function handleOpen() {
      setOpen(true);
    }
    window.addEventListener(OPEN_EVENT, handleOpen);
    return () => window.removeEventListener(OPEN_EVENT, handleOpen);
  }, []);

  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Join the Movement"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-lg rounded-lg bg-white p-8 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-6 flex items-start justify-between">
          <h2 className="font-[family-name:var(--font-headline)] text-xl text-primary">
            Join the Movement
          </h2>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close"
            className="text-on-surface-variant hover:text-primary"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {embedUrl ? (
          <iframe
            src={embedUrl}
            title="Join the Movement — Email Signup"
            loading="lazy"
            className="h-[480px] w-full rounded-md border-0"
          />
        ) : (
          <p className="text-on-surface-variant">
            Sign-up is coming soon. In the meantime, reach us directly using the contact
            information below.
          </p>
        )}
      </div>
    </div>
  );
}
