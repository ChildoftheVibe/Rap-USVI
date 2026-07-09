import type { Metadata } from "next";
import Link from "next/link";
import { site, contact, donation } from "@/lib/content";
import { DonationWidget } from "@/components/donate/DonationWidget";

export const metadata: Metadata = {
  title: `Donate | ${site.name}`,
  description:
    "Support Restore America's Paradise, Inc. with a secure, tax-deductible one-time gift via PayPal. Every donation fuels civic education, leadership development, and community restoration across the U.S. Virgin Islands.",
};

const IMPACT_CARDS = [
  {
    icon: "gavel",
    title: "Political Empowerment",
    description: "Fund advocacy campaigns for greater territorial representation and fair federal resources.",
  },
  {
    icon: "history_edu",
    title: "Leadership Academy",
    description: "Equip cadets with the uniforms, materials, and training that build the territory's next leaders.",
  },
  {
    icon: "campaign",
    title: "Civic Engagement",
    description: "Print and distribute the outreach materials that mobilize communities across every island.",
  },
];

export default function DonatePage() {
  return (
    <div>
      <section className="bg-primary py-24 text-white">
        <div className="mx-auto max-w-container-max px-margin-mobile text-center md:px-margin-desktop">
          <span className="inline-block w-max rounded-chip bg-harvest-gold px-4 py-1 text-xs font-medium uppercase tracking-widest text-primary">
            Support the Movement
          </span>
          <h1 className="mx-auto mt-4 max-w-3xl font-[family-name:var(--font-headline)] text-4xl font-semibold leading-tight md:text-5xl">
            Fuel the Restoration of Our Paradise
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/85">
            Every gift — large or small — directly advances civic education, leadership development, and
            community restoration across the U.S. Virgin Islands.
          </p>
          <p className="mx-auto mt-6 max-w-xl text-sm text-white/70">
            {site.legalName} is a tax-exempt 501(c)(3) organization. Your gift is tax-deductible to the extent
            allowed by law.
          </p>
        </div>
      </section>

      <section className="bg-surface py-24">
        <div className="mx-auto max-w-container-max px-margin-mobile md:px-margin-desktop">
          <div className="grid gap-12 lg:grid-cols-[1.1fr_1fr] lg:items-start">
            <div className="order-2 space-y-10 lg:order-1">
              <div>
                <h2 className="font-[family-name:var(--font-headline)] text-2xl text-primary md:text-3xl">
                  Where Your Gift Goes
                </h2>
                <p className="mt-3 text-on-surface-variant">
                  RAP directs every dollar toward the five strategic pillars that anchor our mission.
                </p>
              </div>

              <div className="grid gap-6 sm:grid-cols-3">
                {IMPACT_CARDS.map((card) => (
                  <div
                    key={card.title}
                    className="group rounded-lg border-t-4 border-harvest-gold bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-xl"
                  >
                    <span
                      aria-hidden="true"
                      className="material-symbols-outlined mb-4 block text-3xl text-primary transition-transform group-hover:scale-110"
                    >
                      {card.icon}
                    </span>
                    <h3 className="mb-2 font-[family-name:var(--font-headline)] text-lg text-primary">
                      {card.title}
                    </h3>
                    <p className="text-sm text-on-surface-variant">{card.description}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-6">
                <div className="flex items-start gap-3">
                  <span aria-hidden="true" className="material-symbols-outlined mt-0.5 text-2xl text-secondary">
                    account_balance
                  </span>
                  <div>
                    <p className="font-medium text-on-surface">{site.legalName}</p>
                    <p className="mt-1 text-sm text-on-surface-variant">
                      A tax-exempt 501(c)(3) organization. EIN {donation.ein}.
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex items-start gap-3 border-t border-outline-variant pt-4">
                  <span aria-hidden="true" className="material-symbols-outlined mt-0.5 text-2xl text-secondary">
                    lock
                  </span>
                  <p className="text-sm text-on-surface-variant">
                    Payments are processed securely by PayPal — we never see or store your card number.
                  </p>
                </div>
                <div className="mt-4 flex items-start gap-3 border-t border-outline-variant pt-4">
                  <span aria-hidden="true" className="material-symbols-outlined mt-0.5 text-2xl text-secondary">
                    mail
                  </span>
                  <p className="text-sm text-on-surface-variant">
                    Planning a large or planned gift? Reach out at{" "}
                    <a href={`mailto:${contact.emails[1] ?? contact.emails[0]}`} className="text-primary hover:underline">
                      {contact.emails[1] ?? contact.emails[0]}
                    </a>
                    .
                  </p>
                </div>
                <p className="mt-4 border-t border-outline-variant pt-4 text-xs text-on-surface-variant">
                  Read our{" "}
                  <Link href="/donation-policy" className="text-primary hover:underline">
                    Donation Policy
                  </Link>{" "}
                  for details on receipts, refunds, and how funds are used.
                </p>
              </div>
            </div>

            <div className="order-1 lg:sticky lg:top-24 lg:order-2">
              <DonationWidget />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
