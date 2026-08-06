import type { Metadata } from "next";
import { site, contact, donation } from "@/lib/content";

export const metadata: Metadata = { title: `Donation Policy | ${site.name}` };

export default function DonationPolicyPage() {
  return (
    <div className="mx-auto max-w-3xl px-margin-mobile py-24 md:px-margin-desktop">
      <h1 className="mb-8 font-[family-name:var(--font-headline)] text-3xl text-primary">Donation Policy</h1>
      <div className="space-y-6 text-on-surface-variant">
        <p>Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>

        <h2 className="text-xl font-semibold text-primary">Tax-exempt status</h2>
        <p>
          {site.legalName} is a tax-exempt organization under Section 501(c)(3) of the Internal Revenue Code
          (EIN {donation.ein}). Contributions are tax-deductible to the extent allowed by law.
        </p>

        <h2 className="text-xl font-semibold text-primary">Use of funds</h2>
        <p>
          Donations support {site.name}&apos;s mission across our five strategic pillars — political
          empowerment, economic revival, cultural restoration, environmental stewardship, and civic
          engagement — including the Leadership Academy and our community events. Allocation of funds is
          directed by the organization&apos;s board.
        </p>

        <h2 className="text-xl font-semibold text-primary">Payment processing</h2>
        <p>
          One-time gifts made at {site.domain}/donate are processed securely through PayPal. We never
          receive or store your card number; PayPal handles all payment details directly.
        </p>

        <h2 className="text-xl font-semibold text-primary">Receipts</h2>
        <p>
          A tax receipt is emailed automatically to the address you provide (or your PayPal email) after
          each completed gift. If you need a receipt reissued or corrected, contact us at{" "}
          <a href={`mailto:${contact.emails[1] ?? contact.emails[0]}`} className="text-primary hover:underline">
            {contact.emails[1] ?? contact.emails[0]}
          </a>
          .
        </p>

        <h2 className="text-xl font-semibold text-primary">Refunds</h2>
        <p>
          If you made a donation in error or were charged more than once, contact{" "}
          <a href={`mailto:${contact.emails[1] ?? contact.emails[0]}`} className="text-primary hover:underline">
            {contact.emails[1] ?? contact.emails[0]}
          </a>{" "}
          within 30 days of the transaction and we will process a refund back to your original payment
          method.
        </p>

        <h2 className="text-xl font-semibold text-primary">No goods or services</h2>
        <p>
          No goods or services were provided in exchange for any contribution made through {site.domain}
          /donate, unless otherwise stated at the time of the gift.
        </p>

        <h2 className="text-xl font-semibold text-primary">Donor privacy</h2>
        <p>
          Donor information is never sold or traded. Donor and payment records are handled per our{" "}
          <a href="/privacy" className="text-primary hover:underline">
            Privacy Policy
          </a>
          . We do not publicly identify individual donors or gift amounts without consent.
        </p>

        <h2 className="text-xl font-semibold text-primary">Contact</h2>
        <p>
          Questions about giving?{" "}
          <a href={`mailto:${contact.emails[1] ?? contact.emails[0]}`} className="text-primary hover:underline">
            {contact.emails[1] ?? contact.emails[0]}
          </a>{" "}
          or{" "}
          <a href={contact.phoneHref} className="text-primary hover:underline">
            {contact.phone}
          </a>
          .
        </p>
      </div>
    </div>
  );
}
