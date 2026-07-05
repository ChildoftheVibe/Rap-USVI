import type { Metadata } from "next";
import { site, contact } from "@/lib/content";

export const metadata: Metadata = { title: `Accessibility Statement | ${site.name}` };

const accessibilityContactEmails = ["info@rap-usvi.org"];

export default function AccessibilityPage() {
  return (
    <div className="mx-auto max-w-3xl px-margin-mobile py-24 md:px-margin-desktop">
      <h1 className="mb-8 font-[family-name:var(--font-headline)] text-3xl text-primary">
        Accessibility Statement
      </h1>
      <div className="space-y-6 text-on-surface-variant">
        <p>
          {site.legalName} is committed to ensuring {site.domain} is accessible to everyone,
          including people with disabilities. We aim to conform to the Web Content Accessibility
          Guidelines (WCAG) 2.1 Level AA.
        </p>
        <p>
          If you encounter any barrier to accessing content or using any feature on this site,
          please let us know so we can address it:{" "}
          {accessibilityContactEmails.map((email, i) => (
            <span key={email}>
              {i > 0 && " or "}
              <a href={`mailto:${email}`} className="text-primary hover:underline">
                {email}
              </a>
            </span>
          ))}{" "}
          or {contact.phone}.
        </p>
      </div>
    </div>
  );
}
