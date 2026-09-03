import type { Metadata } from "next";
import { site, contact } from "@/lib/content";

export const metadata: Metadata = { title: `Cookie Policy | ${site.name}` };

export default function CookiePolicyPage() {
  return (
    <div className="mx-auto max-w-3xl px-margin-mobile py-24 md:px-margin-desktop">
      <h1 className="mb-8 font-[family-name:var(--font-headline)] text-3xl text-primary">
        Cookie Policy
      </h1>
      <div className="space-y-6 text-on-surface-variant">
        <p>Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>

        <p>
          This Cookie Policy explains how {site.legalName} (&quot;we&quot;, &quot;us&quot;) uses
          cookies and similar technologies on {site.domain}, and the choices available to you.
        </p>

        <h2 className="text-xl font-semibold text-primary">Strictly necessary cookies</h2>
        <p>
          These are required for the site to function and cannot be switched off. They include
          Cloudflare Turnstile, which verifies that form submissions are not automated, and
          session cookies used by our hosting provider. These are set without asking for consent
          under applicable EU/UK law, as they are essential to the service you request.
        </p>

        <h2 className="text-xl font-semibold text-primary">Analytics cookies</h2>
        <p>
          With your consent, we use PostHog to understand how visitors use this site — for
          example, which pages are viewed — so we can improve it. These cookies are only set
          after you accept them in the cookie banner, and you can withdraw consent at any time by
          clearing your browser&apos;s site data and reloading the page.
        </p>

        <h2 className="text-xl font-semibold text-primary">Your choices</h2>
        <p>
          When you first visit {site.domain}, you can accept or decline analytics cookies. If you
          decline, only strictly necessary cookies are set. You can also block or delete cookies
          at any time through your browser settings, though this may affect how parts of the site
          function.
        </p>

        <h2 className="text-xl font-semibold text-primary">Contact us</h2>
        <p>
          Questions about this policy can be sent to{" "}
          {contact.emails.map((email, i) => (
            <span key={email}>
              {i > 0 && " or "}
              <a href={`mailto:${email}`} className="text-primary hover:underline">
                {email}
              </a>
            </span>
          ))}
          .
        </p>
      </div>
    </div>
  );
}
