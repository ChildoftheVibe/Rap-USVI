"use client";

import { useEffect, useState } from "react";
import { NewsletterSignupForm } from "@/components/forms/NewsletterSignupForm";

const OPEN_EVENT = "rap:open-join-modal";

export function openJoinModal(): void {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

export function JoinMovementModal() {
  const [open, setOpen] = useState(false);

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
            className="-mr-2 flex h-11 w-11 items-center justify-center rounded-md text-on-surface-variant transition-colors hover:text-primary"
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              close
            </span>
          </button>
        </div>

        <NewsletterSignupForm />
      </div>
    </div>
  );
}
