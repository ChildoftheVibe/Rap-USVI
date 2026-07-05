import type { Metadata } from "next";
import { site } from "@/lib/content";

export const metadata: Metadata = { title: `Terms of Use | ${site.name}` };

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-margin-mobile py-24 md:px-margin-desktop">
      <h1 className="mb-8 font-[family-name:var(--font-headline)] text-3xl text-primary">
        Terms of Use
      </h1>
      <div className="space-y-6 text-on-surface-variant">
        <p>
          By using {site.domain}, you agree to use this site for lawful purposes only. Content on
          this site — including text, graphics, and the {site.legalName} name and seal — is the
          property of {site.legalName} and may not be reproduced without permission.
        </p>
        <p>
          Information about our initiatives, including the America&apos;s Paradise Leadership
          Academy and community events, is provided for informational purposes and is subject to
          change as plans develop.
        </p>
        <p>
          We make no warranties about the completeness or accuracy of information on this site and
          are not liable for any damages arising from its use.
        </p>
      </div>
    </div>
  );
}
