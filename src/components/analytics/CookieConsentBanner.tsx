"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";

export const COOKIE_CONSENT_KEY = "cookie-consent";
export const COOKIE_CONSENT_EVENT = "cookie-consent-change";

export type CookieConsent = "accepted" | "declined";

export function getCookieConsent(): CookieConsent | null {
  if (typeof window === "undefined") return null;
  const value = window.localStorage.getItem(COOKIE_CONSENT_KEY);
  return value === "accepted" || value === "declined" ? value : null;
}

function setCookieConsent(value: CookieConsent) {
  window.localStorage.setItem(COOKIE_CONSENT_KEY, value);
  window.dispatchEvent(new CustomEvent(COOKIE_CONSENT_EVENT, { detail: value }));
}

function subscribe(callback: () => void) {
  window.addEventListener(COOKIE_CONSENT_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(COOKIE_CONSENT_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

export function CookieConsentBanner() {
  const consent = useSyncExternalStore(subscribe, getCookieConsent, () => null);

  if (consent !== null) return null;

  const choose = (value: CookieConsent) => setCookieConsent(value);

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-primary/10 bg-surface px-margin-mobile py-md shadow-[0_-4px_16px_rgba(0,0,0,0.1)] md:px-margin-desktop">
      <div className="mx-auto flex w-full max-w-container-max flex-col items-center gap-4 md:flex-row md:justify-between">
        <p className="text-center text-sm text-on-surface-variant md:text-left">
          We use strictly necessary cookies to run this site, and — with your consent — analytics
          cookies to understand how it&apos;s used. See our{" "}
          <Link href="/cookies" className="text-primary hover:underline">
            Cookie Policy
          </Link>{" "}
          for details.
        </p>
        <div className="flex shrink-0 gap-3">
          <button
            type="button"
            onClick={() => choose("declined")}
            className="rounded-md border border-primary/30 px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/5"
          >
            Decline
          </button>
          <button
            type="button"
            onClick={() => choose("accepted")}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:opacity-90"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
