import type { Metadata } from "next";
import { site, contact } from "@/lib/content";

export const metadata: Metadata = { title: `Privacy Policy | ${site.name}` };

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-margin-mobile py-24 md:px-margin-desktop">
      <h1 className="mb-8 font-[family-name:var(--font-headline)] text-3xl text-primary">
        Privacy Policy
      </h1>
      <div className="space-y-6 text-on-surface-variant">
        <p>Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>

        <h2 className="text-xl font-semibold text-primary">What we collect</h2>
        <p>
          When you submit the Stakeholder Inquiry form on {site.domain}, we collect your full
          name, email address, selected interest area, and message. We also record a salted,
          hashed version of your IP address, your browser&apos;s user agent, and a spam-verification
          result — never your raw IP address.
        </p>

        <h2 className="text-xl font-semibold text-primary">Why we collect it</h2>
        <p>
          This information is used solely to respond to your inquiry, maintain a record of
          community and stakeholder outreach, and to prevent automated abuse of our contact form.
        </p>

        <h2 className="text-xl font-semibold text-primary">Who we share it with</h2>
        <p>
          We use the following service providers to operate this site and respond to inquiries:
          Supabase (secure database storage), Resend (email delivery), Cloudflare Turnstile (spam
          prevention), PostHog (aggregate site analytics), and Vercel (hosting). These providers
          process data on our behalf and do not use it for their own purposes.
        </p>

        <h2 className="text-xl font-semibold text-primary">Retention</h2>
        <p>
          Inquiry records are retained for our internal recordkeeping and are not sold or shared
          with third parties for marketing purposes.
        </p>

        <h2 className="text-xl font-semibold text-primary">Your rights</h2>
        <p>
          To request access to, correction of, or deletion of your data, contact us at{" "}
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
