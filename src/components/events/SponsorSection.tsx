"use client";

import { useState } from "react";
import { formatUsd } from "@/lib/donations";
import { sponsorContact } from "@/lib/content";
import type { SponsorTier } from "@/lib/validation/event";
import { EventPayPalCheckout, type CheckoutSuccess } from "@/components/events/EventPayPalCheckout";

export interface SponsorTierView extends SponsorTier {
  remaining: number | null;
}

interface SponsorSectionProps {
  slug: string;
  eventTitle: string;
  tiers: SponsorTierView[];
  salesOpen: boolean;
}

const FIELD_CLASS =
  "w-full rounded-sm border border-outline-variant bg-surface px-4 py-3 outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary";
const LABEL_CLASS = "mb-2 block text-sm font-medium text-on-surface-variant";
const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2";
const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function SponsorSection({ slug, eventTitle, tiers, salesOpen }: SponsorSectionProps) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [organization, setOrganization] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [success, setSuccess] = useState<CheckoutSuccess | null>(null);

  const selected = tiers.find((t) => t.key === selectedKey) ?? null;
  const ready = !!selected && fullName.trim().length > 0 && EMAIL_PATTERN.test(email.trim());

  return (
    <section id="sponsor" aria-labelledby="sponsor-heading" className="space-y-6 border-t border-outline-variant pt-10">
      <div>
        <span className="inline-block rounded-chip bg-harvest-gold px-4 py-1 text-xs font-medium uppercase tracking-widest text-primary">
          Sponsorship
        </span>
        <h2 id="sponsor-heading" className="mt-3 font-[family-name:var(--font-headline)] text-2xl text-primary md:text-3xl">
          Become a Sponsor
        </h2>
        <p className="mt-2 text-on-surface-variant">
          Partner with Restore America&apos;s Paradise to make {eventTitle} possible. Choose a level below to sponsor
          online with PayPal.
        </p>
      </div>

      {success ? (
        <div role="status" className="rounded-lg border border-outline-variant bg-white p-8 text-center shadow-sm">
          <span aria-hidden="true" className="material-symbols-outlined mb-4 block text-5xl text-harvest-gold">
            volunteer_activism
          </span>
          <h3 className="font-[family-name:var(--font-headline)] text-xl text-primary">Thank you for your sponsorship!</h3>
          <p className="mt-2 text-on-surface-variant">
            Your {success.tierName ?? "sponsorship"} gift of{" "}
            <strong className="text-on-surface">{formatUsd(success.amountCents)}</strong> was received.
            {success.email ? ` A receipt was sent to ${success.email}.` : ""} Our team will be in touch about your
            recognition.
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            {tiers.map((tier) => {
              const soldOut = tier.remaining !== null && tier.remaining <= 0;
              const isSelected = tier.key === selectedKey;
              return (
                <div
                  key={tier.key}
                  className={`flex flex-col rounded-lg border-t-4 bg-white p-6 shadow-sm transition-shadow ${
                    isSelected ? "border-primary shadow-lg ring-1 ring-primary" : "border-harvest-gold"
                  }`}
                >
                  <h3 className="font-[family-name:var(--font-headline)] text-lg text-primary">{tier.name}</h3>
                  <p className="mt-1 text-2xl font-semibold text-on-surface">{formatUsd(tier.amountCents)}</p>
                  {tier.limit !== null && (
                    <p className="mt-1 text-xs font-medium uppercase tracking-wide text-on-surface-variant">
                      {soldOut ? "Fully sponsored" : `${tier.remaining} of ${tier.limit} available`}
                    </p>
                  )}
                  {tier.description && (
                    <p className="mt-3 whitespace-pre-line text-sm text-on-surface-variant">{tier.description}</p>
                  )}
                  <div className="mt-auto pt-5">
                    <button
                      type="button"
                      disabled={soldOut || !salesOpen}
                      aria-pressed={isSelected}
                      onClick={() => setSelectedKey(tier.key)}
                      className={`btn btn-md w-full ${isSelected ? "btn-primary" : "btn-outline"} ${FOCUS_RING} disabled:cursor-not-allowed disabled:opacity-50`}
                    >
                      {soldOut ? "Fully sponsored" : isSelected ? "Selected" : "Choose this level"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {selected && salesOpen && (
            <div className="rounded-lg border border-outline-variant bg-white p-6 shadow-sm md:p-8">
              <h3 className="font-[family-name:var(--font-headline)] text-xl text-primary">
                {selected.name}: {formatUsd(selected.amountCents)}
              </h3>
              <div className="mt-6 space-y-5">
                {/* Honeypot: hidden from people and keyboard focus, present for bots */}
                <div className="absolute left-[-9999px]" aria-hidden="true">
                  <label htmlFor="sponsor-company">Company</label>
                  <input
                    id="sponsor-company"
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor="sponsor-org" className={LABEL_CLASS}>
                    BUSINESS, CHURCH, OR ORGANIZATION (OPTIONAL)
                  </label>
                  <input
                    id="sponsor-org"
                    type="text"
                    autoComplete="organization"
                    value={organization}
                    onChange={(e) => setOrganization(e.target.value)}
                    className={FIELD_CLASS}
                  />
                  <p className="mt-1 text-xs text-on-surface-variant">Write it the way you want it shown on sponsor recognition.</p>
                </div>
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label htmlFor="sponsor-name" className={LABEL_CLASS}>
                      CONTACT NAME
                    </label>
                    <input
                      id="sponsor-name"
                      type="text"
                      autoComplete="name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className={FIELD_CLASS}
                    />
                  </div>
                  <div>
                    <label htmlFor="sponsor-email" className={LABEL_CLASS}>
                      EMAIL ADDRESS
                    </label>
                    <input
                      id="sponsor-email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={FIELD_CLASS}
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="sponsor-phone" className={LABEL_CLASS}>
                    PHONE (OPTIONAL)
                  </label>
                  <input
                    id="sponsor-phone"
                    type="tel"
                    autoComplete="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className={FIELD_CLASS}
                  />
                </div>

                <EventPayPalCheckout
                  slug={slug}
                  ready={ready}
                  getPayload={() =>
                    ready && selected
                      ? {
                          kind: "sponsorship",
                          tierKey: selected.key,
                          organization: organization.trim(),
                          fullName: fullName.trim(),
                          email: email.trim(),
                          phone,
                          company,
                        }
                      : null
                  }
                  onSuccess={setSuccess}
                />
              </div>
            </div>
          )}

          <p className="text-sm text-on-surface-variant">
            Prefer an invoice or to pay by check? Contact {sponsorContact.name} at{" "}
            <a href={`mailto:${sponsorContact.email}`} className="text-primary hover:underline">
              {sponsorContact.email}
            </a>{" "}
            or{" "}
            <a href={`tel:+1${sponsorContact.phone.replace(/[^0-9]/g, "")}`} className="text-primary hover:underline">
              {sponsorContact.phone}
            </a>
            .
          </p>
        </>
      )}
    </section>
  );
}
