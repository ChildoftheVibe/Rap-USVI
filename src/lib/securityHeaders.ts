/** Security headers, applied to every response from next.config.ts. */

const isDev = process.env.NODE_ENV !== "production";

/**
 * Content-Security-Policy.
 *
 * `script-src` keeps 'unsafe-inline', and that is a deliberate trade rather
 * than an oversight. Removing it requires a per-request nonce, and a nonce can
 * only be stamped onto Next.js's inline bootstrap scripts during a per-request
 * render. Most public pages here are prerendered/ISR, so there is no such
 * render — a nonce-based policy blocks Next's own `self.__next_f.push(...)`
 * bootstrap and the site fails to hydrate. (Verified: it breaks.) Buying a
 * strict script-src would mean forcing every public page dynamic and giving up
 * static caching.
 *
 * The XSS risk this would otherwise mitigate is instead handled at the source:
 * stored HTML is sanitized at render time, not just on write, everywhere it
 * reaches dangerouslySetInnerHTML. See src/lib/sanitizeHtml.ts.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://challenges.cloudflare.com https://www.paypal.com https://www.sandbox.paypal.com https://www.paypalobjects.com`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob: https://*.supabase.co https://www.paypalobjects.com https://www.paypal.com https://www.sandbox.paypal.com",
  "frame-src https://challenges.cloudflare.com https://www.paypal.com https://www.sandbox.paypal.com",
  `connect-src 'self'${isDev ? " ws: http://localhost:*" : ""} https://challenges.cloudflare.com https://*.supabase.co https://*.posthog.com https://*.sentry.io https://*.paypal.com`,
  "object-src 'none'",
  "base-uri 'self'",
  // Stops an injected <form> from posting the page's fields off-site.
  "form-action 'self'",
  "frame-ancestors 'self'",
].join("; ");

export const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];
