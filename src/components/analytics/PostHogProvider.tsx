"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import posthog from "posthog-js";
import { COOKIE_CONSENT_EVENT, getCookieConsent, type CookieConsent } from "./CookieConsentBanner";

function loadPostHog(pathname: string | null) {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";
  if (!key || posthog.__loaded) return;

  // Never analytics-track the admin backend. Those screens show donor names,
  // emails, amounts, and RSVP phone numbers — if session recording is ever
  // switched on project-side, this keeps that PII out of PostHog.
  if (pathname?.startsWith("/admin")) return;

  posthog.init(key, {
    api_host: host,
    capture_pageview: true,
    capture_pageleave: true,
    person_profiles: "identified_only",
  });
}

export function PostHogProvider() {
  const pathname = usePathname();

  useEffect(() => {
    // EU cookie law requires opt-in consent before non-essential (analytics)
    // cookies are set, so PostHog only loads once the visitor has accepted.
    if (getCookieConsent() === "accepted") loadPostHog(pathname);

    const onConsentChange = (event: Event) => {
      const consent = (event as CustomEvent<CookieConsent>).detail;
      if (consent === "accepted") loadPostHog(pathname);
    };
    window.addEventListener(COOKIE_CONSENT_EVENT, onConsentChange);
    return () => window.removeEventListener(COOKIE_CONSENT_EVENT, onConsentChange);
  }, [pathname]);

  return null;
}
