"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import type { OnApproveData, OnApproveActions } from "@paypal/paypal-js";
import { contact, donation } from "@/lib/content";
import { formatUsd } from "@/lib/donations";

type Selection = number | "custom";
type WidgetState = "idle" | "error" | "success";

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2";

function impactMessage(amountDollars: number | null): string {
  if (amountDollars === null) return donation.impactByAmount[donation.impactByAmount.length - 1].message;
  const amountCents = Math.round(amountDollars * 100);
  const tier = donation.impactByAmount.find((t) => amountCents >= t.minAmount);
  return (tier ?? donation.impactByAmount[donation.impactByAmount.length - 1]).message;
}

interface SuccessInfo {
  amountCents: number;
  receiptEmail: string | null;
}

export function DonationWidget() {
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;

  const [selection, setSelection] = useState<Selection>(donation.presetAmounts[1]);
  const [customAmount, setCustomAmount] = useState("");
  const [donorName, setDonorName] = useState("");
  const [email, setEmail] = useState("");
  const [dedication, setDedication] = useState("");
  const [company, setCompany] = useState("");
  const [state, setState] = useState<WidgetState>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [success, setSuccess] = useState<SuccessInfo | null>(null);

  const amountDollars = useMemo(() => {
    if (selection === "custom") {
      const parsed = parseFloat(customAmount);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return selection;
  }, [selection, customAmount]);

  const amountValid =
    amountDollars !== null &&
    amountDollars >= donation.minCents / 100 &&
    amountDollars <= donation.maxCents / 100;

  const customAmountError =
    selection === "custom" && customAmount.length > 0 && !amountValid
      ? `Enter an amount between $${donation.minCents / 100} and $${(donation.maxCents / 100).toLocaleString()}`
      : "";

  if (state === "success" && success) {
    return (
      <div
        role="status"
        className="rounded-lg border border-outline-variant bg-surface-container-lowest p-8 text-center shadow-sm"
      >
        <span aria-hidden="true" className="material-symbols-outlined mb-4 block text-5xl text-harvest-gold">
          check_circle
        </span>
        <h2 className="font-[family-name:var(--font-headline)] text-2xl text-primary">Thank You!</h2>
        <p className="mt-3 text-on-surface-variant">
          Your gift of <strong className="text-on-surface">{formatUsd(success.amountCents)}</strong> was
          received.
        </p>
        {success.receiptEmail && (
          <p className="mt-2 text-sm text-on-surface-variant">A tax receipt was sent to {success.receiptEmail}.</p>
        )}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link href="/" className={`btn btn-md btn-primary ${FOCUS_RING}`}>
            Back to home
          </Link>
          <Link href="/events" className={`btn btn-md btn-outline ${FOCUS_RING}`}>
            See upcoming events
          </Link>
        </div>
      </div>
    );
  }

  if (!clientId) {
    return (
      <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-8 text-center shadow-sm">
        <p className="text-on-surface-variant">
          Online giving is temporarily unavailable. Please reach out to{" "}
          <a href={`mailto:${contact.emails[1] ?? contact.emails[0]}`} className="text-primary hover:underline">
            {contact.emails[1] ?? contact.emails[0]}
          </a>{" "}
          and our team will help you give.
        </p>
      </div>
    );
  }

  return (
    <PayPalScriptProvider options={{ clientId, currency: "USD", intent: "capture" }}>
      <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-6 shadow-sm md:p-8">
        <h2 className="mb-6 font-[family-name:var(--font-headline)] text-xl text-primary">Make a Gift</h2>

        {/* Honeypot — hidden from sighted users and keyboard tab order, but present in the DOM for bots */}
        <div className="absolute left-[-9999px]" aria-hidden="true">
          <label htmlFor="donate-company">Company</label>
          <input
            id="donate-company"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
          />
        </div>

        <fieldset>
          <legend className="mb-2 block text-sm font-medium text-on-surface-variant">CHOOSE AN AMOUNT</legend>
          <div className="grid grid-cols-3 gap-2">
            {donation.presetAmounts.map((amount) => (
              <button
                key={amount}
                type="button"
                aria-pressed={selection === amount}
                onClick={() => setSelection(amount)}
                className={`rounded-chip border px-3 py-2.5 text-sm font-medium transition-colors ${FOCUS_RING} ${
                  selection === amount
                    ? "border-transparent bg-harvest-gold font-semibold text-primary"
                    : "border-outline-variant text-on-surface-variant hover:border-primary"
                }`}
              >
                ${amount}
              </button>
            ))}
            <button
              type="button"
              aria-pressed={selection === "custom"}
              onClick={() => setSelection("custom")}
              className={`rounded-chip border px-3 py-2.5 text-sm font-medium transition-colors ${FOCUS_RING} ${
                selection === "custom"
                  ? "border-transparent bg-harvest-gold font-semibold text-primary"
                  : "border-outline-variant text-on-surface-variant hover:border-primary"
              }`}
            >
              Custom
            </button>
          </div>
        </fieldset>

        {selection === "custom" && (
          <div className="mt-4">
            <label htmlFor="donate-custom-amount" className="mb-2 block text-sm font-medium text-on-surface-variant">
              CUSTOM AMOUNT
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-on-surface-variant">
                $
              </span>
              <input
                id="donate-custom-amount"
                type="text"
                inputMode="decimal"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                placeholder="0.00"
                aria-invalid={!!customAmountError}
                aria-describedby={customAmountError ? "donate-custom-amount-error" : undefined}
                className="w-full rounded-sm border border-outline-variant bg-surface py-3 pl-8 pr-4 outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
            {customAmountError && (
              <p id="donate-custom-amount-error" className="mt-1 text-sm text-error">
                {customAmountError}
              </p>
            )}
          </div>
        )}

        <p aria-live="polite" className="animate-fade-in mt-4 text-sm text-on-surface-variant" key={impactMessage(amountDollars)}>
          {impactMessage(amountDollars)}
        </p>

        <div className="mt-6 space-y-4 border-t border-outline-variant pt-6">
          <div>
            <label htmlFor="donate-name" className="mb-2 block text-sm font-medium text-on-surface-variant">
              NAME (OPTIONAL)
            </label>
            <input
              id="donate-name"
              type="text"
              value={donorName}
              onChange={(e) => setDonorName(e.target.value)}
              className="w-full rounded-sm border border-outline-variant bg-surface px-4 py-3 outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <label htmlFor="donate-email" className="mb-2 block text-sm font-medium text-on-surface-variant">
              EMAIL FOR RECEIPT (OPTIONAL)
            </label>
            <input
              id="donate-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="We'll use your PayPal email otherwise"
              className="w-full rounded-sm border border-outline-variant bg-surface px-4 py-3 outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <label htmlFor="donate-dedication" className="mb-2 block text-sm font-medium text-on-surface-variant">
              DEDICATION (OPTIONAL)
            </label>
            <input
              id="donate-dedication"
              type="text"
              value={dedication}
              onChange={(e) => setDedication(e.target.value)}
              placeholder="In honor of…"
              className="w-full rounded-sm border border-outline-variant bg-surface px-4 py-3 outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        {state === "error" && (
          <p role="alert" className="mt-4 text-sm text-error">
            {errorMessage}
          </p>
        )}

        <div className="mt-6">
          <PayPalButtons
            style={{ layout: "vertical", label: "donate" }}
            disabled={!amountValid}
            forceReRender={[amountDollars, donorName, email, dedication]}
            createOrder={async () => {
              setState("idle");
              setErrorMessage("");
              const res = await fetch("/api/donations/create-order", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  amount: amountDollars,
                  donorName,
                  email,
                  dedication,
                  company,
                }),
              });
              const body = await res.json().catch(() => ({}));
              if (!res.ok || !body.orderId) {
                setErrorMessage(body.error ?? "Unable to start checkout. Please try again.");
                setState("error");
                throw new Error(body.error ?? "Failed to create order");
              }
              return body.orderId as string;
            }}
            onApprove={async (data: OnApproveData, actions: OnApproveActions) => {
              const res = await fetch("/api/donations/capture", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ orderId: data.orderID }),
              });
              const body = await res.json().catch(() => ({}));

              if (res.status === 409 && body.error === "INSTRUMENT_DECLINED") {
                return actions.restart();
              }

              if (!res.ok) {
                setErrorMessage(body.error ?? "We couldn't complete your donation. Please try again.");
                setState("error");
                return;
              }

              setSuccess({ amountCents: body.amountCents, receiptEmail: body.receiptEmail ?? null });
              setState("success");
            }}
            onError={() => {
              setErrorMessage("Something went wrong with PayPal checkout. Please try again.");
              setState("error");
            }}
          />
        </div>

        <p className="mt-4 text-center text-xs text-on-surface-variant">
          Secure checkout powered by PayPal. {contact.emails[1] ?? contact.emails[0]} for help giving another
          way.
        </p>
      </div>
    </PayPalScriptProvider>
  );
}
