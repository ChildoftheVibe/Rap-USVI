"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";

export interface PopupEventData {
  slug: string;
  title: string;
  popup_headline: string | null;
  popup_body: string | null;
  popup_cta_label: string;
  image_url: string | null;
}

const SHOW_DELAY_MS = 1200;

export function EventPopup({ event }: { event: PopupEventData | null }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!event || typeof window === "undefined") return;
    const dismissKey = `rap:event-popup-dismissed:${event.slug}`;
    if (window.sessionStorage.getItem(dismissKey)) return;
    const timer = setTimeout(() => setOpen(true), SHOW_DELAY_MS);
    return () => clearTimeout(timer);
  }, [event]);

  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function close() {
    setOpen(false);
    if (event) window.sessionStorage.setItem(`rap:event-popup-dismissed:${event.slug}`, "1");
  }

  if (!open || !event) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={event.popup_headline || event.title}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
      onClick={close}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-lg bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {event.image_url && (
          <div className="relative h-40 w-full">
            <Image src={event.image_url} alt="" fill sizes="448px" className="object-cover" />
          </div>
        )}
        <div className="p-8">
          <div className="mb-4 flex items-start justify-between gap-4">
            <h2 className="font-[family-name:var(--font-headline)] text-xl text-primary">
              {event.popup_headline || event.title}
            </h2>
            <button
              type="button"
              onClick={close}
              aria-label="Close"
              className="-mr-2 -mt-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-on-surface-variant transition-colors hover:text-primary"
            >
              <span className="material-symbols-outlined" aria-hidden="true">
                close
              </span>
            </button>
          </div>
          {event.popup_body && <p className="mb-6 text-on-surface-variant">{event.popup_body}</p>}
          <Link href={`/events/${event.slug}`} onClick={close} className="btn btn-md btn-primary w-full">
            {event.popup_cta_label}
          </Link>
        </div>
      </div>
    </div>
  );
}
