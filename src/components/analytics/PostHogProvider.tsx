"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import posthog from "posthog-js";

export function PostHogProvider() {
  const pathname = usePathname();

  useEffect(() => {
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
  }, [pathname]);

  return null;
}
