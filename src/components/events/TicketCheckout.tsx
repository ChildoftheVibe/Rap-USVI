"use client";

import { useState } from "react";
import { formatUsd } from "@/lib/donations";
import { EventPayPalCheckout, type CheckoutSuccess } from "@/components/events/EventPayPalCheckout";

interface TicketCheckoutProps {
  slug: string;
  priceCents: number;
  maxPerOrder: number;
  capacity: number | null;
  spotsLeft: number | null;
}

const FIELD_CLASS =
  "w-full rounded-sm border border-outline-variant bg-surface px-4 py-3 outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary";
const LABEL_CLASS = "mb-2 block text-sm font-medium text-on-surface-variant";
const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function TicketCheckout({ slug, priceCents, maxPerOrder, capacity, spotsLeft }: TicketCheckoutProps) {
  const maxSeats = Math.max(0, Math.min(maxPerOrder, spotsLeft ?? maxPerOrder));
  const [quantity, setQuantity] = useState(1);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [success, setSuccess] = useState<CheckoutSuccess | null>(null);

  if (success) {
    const seats = success.quantity ?? quantity;
    return (
      <div role="status" className="rounded-lg border border-outline-variant bg-white p-8 text-center shadow-xl">
        <span aria-hidden="true" className="material-symbols-outlined mb-4 block text-5xl text-harvest-gold">
          check_circle
        </span>
        <h3 className="mb-2 font-[family-name:var(--font-headline)] text-xl text-primary">
          Your {seats === 1 ? "seat is" : `${seats} seats are`} confirmed!
        </h3>
        <p className="text-on-surface-variant">
          You paid <strong className="text-on-surface">{formatUsd(success.amountCents)}</strong>.
          {success.email ? ` A confirmation was sent to ${success.email}.` : ""}
        </p>
      </div>
    );
  }

  if (maxSeats === 0) {
    return (
      <div className="rounded-lg border border-outline-variant bg-white p-8 text-center shadow-xl">
        <h3 className="mb-2 font-[family-name:var(--font-headline)] text-xl text-primary">Sold out</h3>
        <p className="text-on-surface-variant">Every seat for this event has been reserved. Thank you for your interest!</p>
      </div>
    );
  }

  const ready = fullName.trim().length > 0 && EMAIL_PATTERN.test(email.trim()) && quantity >= 1 && quantity <= maxSeats;

  return (
    <div id="tickets" className="rounded-lg border border-outline-variant bg-white p-8 shadow-xl">
      <h3 className="font-[family-name:var(--font-headline)] text-xl text-primary">Reserve Your Seat</h3>
      <p className="mt-1 text-2xl font-semibold text-on-surface">
        {formatUsd(priceCents)} <span className="text-base font-normal text-on-surface-variant">per seat</span>
      </p>
      {capacity !== null && spotsLeft !== null && (
        <p className="mt-1 text-sm text-on-surface-variant">
          {spotsLeft} of {capacity} seats left
        </p>
      )}

      <div className="mt-6 space-y-5">
        {/* Honeypot: hidden from people and keyboard focus, present for bots */}
        <div className="absolute left-[-9999px]" aria-hidden="true">
          <label htmlFor="ticket-company">Company</label>
          <input
            id="ticket-company"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
          />
        </div>

        <div>
          <label htmlFor="ticket-quantity" className={LABEL_CLASS}>
            NUMBER OF SEATS
          </label>
          <select
            id="ticket-quantity"
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            className={FIELD_CLASS}
          >
            {Array.from({ length: maxSeats }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n} {n === 1 ? "seat" : "seats"} ({formatUsd(priceCents * n)})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="ticket-fullName" className={LABEL_CLASS}>
            FULL NAME
          </label>
          <input
            id="ticket-fullName"
            type="text"
            autoComplete="name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className={FIELD_CLASS}
          />
        </div>

        <div>
          <label htmlFor="ticket-email" className={LABEL_CLASS}>
            EMAIL ADDRESS
          </label>
          <input
            id="ticket-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={FIELD_CLASS}
          />
          <p className="mt-1 text-xs text-on-surface-variant">Your confirmation and receipt go here.</p>
        </div>

        <div>
          <label htmlFor="ticket-phone" className={LABEL_CLASS}>
            PHONE (OPTIONAL)
          </label>
          <input
            id="ticket-phone"
            type="tel"
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={FIELD_CLASS}
          />
        </div>

        <div className="flex items-center justify-between border-t border-outline-variant pt-4">
          <span className="text-sm font-medium text-on-surface-variant">TOTAL</span>
          <span className="text-xl font-semibold text-on-surface">{formatUsd(priceCents * quantity)}</span>
        </div>

        <EventPayPalCheckout
          slug={slug}
          ready={ready}
          getPayload={() =>
            ready ? { kind: "ticket", quantity, fullName: fullName.trim(), email: email.trim(), phone, company } : null
          }
          onSuccess={setSuccess}
        />
      </div>
    </div>
  );
}
