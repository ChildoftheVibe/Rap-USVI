"use client";

import { useEffect, useRef, useState } from "react";
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

const BULLET_PATTERN = /^\s*[·•\-*]\s*/;

/** Splits a level's description into intro text and bullet points (lines starting with ·, •, - or *). */
function parseDescription(description: string) {
  const lines = description
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const intro = lines.filter((line) => !BULLET_PATTERN.test(line)).join(" ");
  const bullets = lines.filter((line) => BULLET_PATTERN.test(line)).map((line) => line.replace(BULLET_PATTERN, ""));
  return { intro, bullets };
}

/** First sentence of the intro, for the compact card. */
function tagline(intro: string): string {
  const match = intro.match(/^.+?[.!?](\s|$)/);
  return (match ? match[0] : intro).trim();
}

function seatsLabel(seats: number): string {
  return `Includes ${seats} ${seats === 1 ? "seat" : "seats"}`;
}

interface TierDetailsDialogProps {
  tier: SponsorTierView | null;
  canChoose: boolean;
  onClose: () => void;
  onChoose: (key: string) => void;
}

/** Full benefit list for one level, in a native modal dialog (Escape and the close button both close it). */
function TierDetailsDialog({ tier, canChoose, onClose, onChoose }: TierDetailsDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (tier && !dialog.open) dialog.showModal();
    if (!tier && dialog.open) dialog.close();
  }, [tier]);

  const details = tier ? parseDescription(tier.description) : null;
  const soldOut = !!tier && tier.remaining !== null && tier.remaining <= 0;

  return (
    <dialog
      ref={ref}
      aria-labelledby="sponsor-dialog-title"
      onClose={onClose}
      onClick={(e) => {
        // A click on the dimmed backdrop (outside the panel) closes it.
        if (e.target === ref.current) onClose();
      }}
      className="m-auto w-[min(36rem,calc(100vw-2rem))] max-h-[85vh] rounded-lg bg-white p-0 text-on-surface shadow-2xl backdrop:bg-black/60"
    >
      {tier && details && (
        <div className="flex max-h-[85vh] flex-col">
          <div className="border-t-4 border-harvest-gold px-6 pb-4 pt-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 id="sponsor-dialog-title" className="font-[family-name:var(--font-headline)] text-2xl text-primary">
                  {tier.name}
                </h3>
                <p className="mt-1 text-2xl font-semibold">{formatUsd(tier.amountCents)}</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className={`rounded-full p-1 text-on-surface-variant hover:bg-surface-container-lowest ${FOCUS_RING}`}
              >
                <span aria-hidden="true" className="material-symbols-outlined">
                  close
                </span>
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {(tier.seats ?? 0) > 0 && (
                <span className="rounded-chip bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                  {seatsLabel(tier.seats)}
                </span>
              )}
              {tier.limit !== null && (
                <span className="rounded-chip bg-harvest-gold/20 px-3 py-1 text-xs font-medium text-primary">
                  {soldOut ? "Fully sponsored" : `Only ${tier.remaining} of ${tier.limit} available`}
                </span>
              )}
            </div>
          </div>

          <div className="overflow-y-auto px-6 pb-2">
            {details.intro && <p className="text-on-surface-variant">{details.intro}</p>}
            {details.bullets.length > 0 && (
              <>
                <h4 className="mt-5 text-sm font-semibold uppercase tracking-wide text-on-surface-variant">
                  Benefits
                </h4>
                <ul className="mt-3 space-y-2">
                  {details.bullets.map((item, i) => (
                    <li key={i} className="flex gap-3 text-sm text-on-surface">
                      <span aria-hidden="true" className="material-symbols-outlined text-lg leading-5 text-harvest-gold">
                        check_circle
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>

          <div className="flex flex-col gap-3 border-t border-outline-variant px-6 py-4 sm:flex-row-reverse">
            <button
              type="button"
              disabled={soldOut || !canChoose}
              onClick={() => onChoose(tier.key)}
              className={`btn btn-md btn-primary sm:flex-1 ${FOCUS_RING} disabled:cursor-not-allowed disabled:opacity-50`}
            >
              {soldOut ? "Fully sponsored" : `Sponsor at ${formatUsd(tier.amountCents)}`}
            </button>
            <button type="button" onClick={onClose} className={`btn btn-md btn-outline sm:flex-1 ${FOCUS_RING}`}>
              Back to all levels
            </button>
          </div>
        </div>
      )}
    </dialog>
  );
}

export function SponsorSection({ slug, eventTitle, tiers, salesOpen }: SponsorSectionProps) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [organization, setOrganization] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [success, setSuccess] = useState<CheckoutSuccess | null>(null);
  const [detailsKey, setDetailsKey] = useState<string | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  const selected = tiers.find((t) => t.key === selectedKey) ?? null;
  const detailsTier = tiers.find((t) => t.key === detailsKey) ?? null;
  const topAmount = Math.max(...tiers.map((t) => t.amountCents));

  function chooseTier(key: string) {
    setDetailsKey(null);
    setSelectedKey(key);
  }

  // Bring the sponsor form into view once a level is chosen.
  useEffect(() => {
    if (selectedKey) formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [selectedKey]);
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
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {tiers.map((tier) => {
              const soldOut = tier.remaining !== null && tier.remaining <= 0;
              const isSelected = tier.key === selectedKey;
              const isPremier = tier.amountCents === topAmount && tiers.length > 1;
              const { intro } = parseDescription(tier.description || "");
              return (
                <div
                  key={tier.key}
                  className={`relative flex flex-col rounded-lg p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg ${
                    isPremier ? "bg-primary text-white" : "border-t-4 border-harvest-gold bg-white"
                  } ${isSelected ? "ring-2 ring-harvest-gold ring-offset-2" : ""}`}
                >
                  {isPremier && (
                    <span className="absolute -top-3 left-6 rounded-chip bg-harvest-gold px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
                      Premier
                    </span>
                  )}
                  <h3
                    className={`font-[family-name:var(--font-headline)] text-lg leading-snug ${isPremier ? "text-white" : "text-primary"}`}
                  >
                    {tier.name}
                  </h3>
                  <p className={`mt-2 text-3xl font-semibold ${isPremier ? "text-harvest-gold" : "text-on-surface"}`}>
                    {formatUsd(tier.amountCents).replace(/\.00$/, "")}
                  </p>

                  <div className="mt-3 flex min-h-7 flex-wrap gap-2">
                    {(tier.seats ?? 0) > 0 && (
                      <span
                        className={`rounded-chip px-3 py-1 text-xs font-medium ${isPremier ? "bg-white/15 text-white" : "bg-primary/10 text-primary"}`}
                      >
                        {seatsLabel(tier.seats)}
                      </span>
                    )}
                    {tier.limit !== null && (
                      <span
                        className={`rounded-chip px-3 py-1 text-xs font-medium ${isPremier ? "bg-harvest-gold text-primary" : "bg-harvest-gold/20 text-primary"}`}
                      >
                        {soldOut ? "Fully sponsored" : `Only ${tier.remaining} left`}
                      </span>
                    )}
                  </div>

                  {intro && (
                    <p className={`mt-3 line-clamp-3 text-sm ${isPremier ? "text-white/85" : "text-on-surface-variant"}`}>
                      {tagline(intro)}
                    </p>
                  )}

                  <div className="mt-auto space-y-2 pt-5">
                    {tier.description && (
                      <button
                        type="button"
                        onClick={() => setDetailsKey(tier.key)}
                        className={`w-full rounded-sm py-1 text-sm font-medium underline-offset-4 hover:underline ${
                          isPremier ? "text-harvest-gold" : "text-primary"
                        } ${FOCUS_RING}`}
                      >
                        See more
                        <span className="sr-only"> about {tier.name}</span>
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={soldOut || !salesOpen}
                      aria-pressed={isSelected}
                      onClick={() => chooseTier(tier.key)}
                      className={`btn btn-md w-full ${
                        isPremier ? "btn-gold" : isSelected ? "btn-primary" : "btn-outline"
                      } ${FOCUS_RING} disabled:cursor-not-allowed disabled:opacity-50`}
                    >
                      {soldOut ? "Fully sponsored" : isSelected ? "Selected" : "Choose"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <TierDetailsDialog
            tier={detailsTier}
            canChoose={salesOpen}
            onClose={() => setDetailsKey(null)}
            onChoose={chooseTier}
          />

          {selected && salesOpen && (
            <div ref={formRef} className="max-w-3xl scroll-mt-24 rounded-lg border border-outline-variant bg-white p-6 shadow-sm md:p-8">
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
