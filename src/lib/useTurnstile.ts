import { useEffect, useRef } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: { sitekey: string; callback: (token: string) => void }
      ) => string;
      remove: (widgetId: string) => void;
    };
  }
}

/**
 * Explicitly renders a Cloudflare Turnstile widget into the returned ref.
 *
 * Cloudflare's script only auto-renders `.cf-turnstile` elements present in
 * the DOM at the moment it first loads. That breaks for widgets that mount
 * later (e.g. inside a modal opened after the script already loaded for a
 * different widget on the page), so we poll for `window.turnstile` and call
 * `render()` ourselves once it's available.
 */
export function useTurnstile(siteKey: string | undefined, onVerified: (token: string) => void) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const onVerifiedRef = useRef(onVerified);
  useEffect(() => {
    onVerifiedRef.current = onVerified;
  }, [onVerified]);

  useEffect(() => {
    if (!siteKey || !containerRef.current) return;

    let cancelled = false;
    let pollId: ReturnType<typeof setInterval> | undefined;

    function renderWidget() {
      if (cancelled || !containerRef.current || !window.turnstile) return;
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey!,
        callback: (token: string) => onVerifiedRef.current(token),
      });
    }

    if (window.turnstile) {
      renderWidget();
    } else {
      pollId = setInterval(() => {
        if (window.turnstile) {
          clearInterval(pollId);
          renderWidget();
        }
      }, 100);
    }

    return () => {
      cancelled = true;
      if (pollId) clearInterval(pollId);
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [siteKey]);

  return containerRef;
}
