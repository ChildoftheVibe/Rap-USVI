"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { PayPalButtons } from "@paypal/react-paypal-js";
import type { OnApproveData, OnApproveActions } from "@paypal/paypal-js";
import { useTurnstile } from "@/lib/useTurnstile";
import type { EventCheckoutInput } from "@/lib/validation/checkout";

export interface CheckoutSuccess {
  kind: "ticket" | "sponsorship";
  amountCents: number;
  quantity: number | null;
  tierName: string | null;
  email: string | null;
}

type CheckoutPayload = Omit<EventCheckoutInput, "turnstileToken">;

interface EventPayPalCheckoutProps {
  slug: string;
  /** Returns the current form values, or null while the form isn't ready to pay. */
  getPayload: () => CheckoutPayload | null;
  ready: boolean;
  onSuccess: (result: CheckoutSuccess) => void;
}

function TurnstileBox({ siteKey, onToken }: { siteKey: string; onToken: (token: string) => void }) {
  const ref = useTurnstile(siteKey, onToken);
  return <div ref={ref} />;
}

/**
 * PayPal buttons plus the Turnstile check for event tickets and sponsorships.
 * Prices are never sent from here; the server looks them up.
 */
export function EventPayPalCheckout({ slug, getPayload, ready, onSuccess }: EventPayPalCheckoutProps) {
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const [turnstileToken, setTurnstileToken] = useState("");
  // Turnstile tokens work once. After each checkout attempt the widget is
  // remounted to fetch a fresh one, so a buyer who closes the PayPal window
  // can simply try again.
  const [turnstileRound, setTurnstileRound] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [notice, setNotice] = useState("");
  // Set when createOrder already showed a specific reason, so the generic
  // PayPal onError that follows doesn't overwrite it.
  const explainedRef = useRef(false);

  // The PayPal buttons keep the callbacks they were first rendered with, and
  // re-rendering them (forceReRender) while the PayPal window is open closes
  // that window. So nothing that changes mid-checkout is passed to them as a
  // prop: the callbacks read the latest values from these refs instead.
  const tokenRef = useRef(turnstileToken);
  const getPayloadRef = useRef(getPayload);
  const onSuccessRef = useRef(onSuccess);
  useEffect(() => {
    tokenRef.current = turnstileToken;
    getPayloadRef.current = getPayload;
    onSuccessRef.current = onSuccess;
  });

  function freshTurnstile() {
    if (!turnstileSiteKey) return;
    tokenRef.current = "";
    setTurnstileToken("");
    setTurnstileRound((n) => n + 1);
  }

  if (!clientId) {
    return (
      <p className="text-sm text-on-surface-variant">
        Online payment is temporarily unavailable. Please contact us and we&apos;ll help you another way.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {turnstileSiteKey && (
        <>
          <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="afterInteractive" />
          <TurnstileBox key={turnstileRound} siteKey={turnstileSiteKey} onToken={setTurnstileToken} />
        </>
      )}

      {errorMessage && (
        <p role="alert" className="text-sm text-error">
          {errorMessage}
        </p>
      )}
      {notice && (
        <p role="status" className="rounded-sm bg-surface-container-lowest p-3 text-sm text-on-surface">
          {notice}
        </p>
      )}

      {/* The SDK itself is loaded once per page by EventPayPalProvider. */}
      <PayPalButtons
          style={{ layout: "vertical", label: "pay" }}
          disabled={!ready}
          createOrder={async () => {
            setErrorMessage("");
            setNotice("");
            explainedRef.current = false;
            const payload = getPayloadRef.current();
            if (!payload) {
              setErrorMessage("Please fill in the form above first.");
              explainedRef.current = true;
              throw new Error("Form incomplete");
            }
            const token = tokenRef.current;
            if (turnstileSiteKey && !token) {
              setErrorMessage("Please wait for the security check above to finish, then try again.");
              explainedRef.current = true;
              throw new Error("Turnstile not ready");
            }
            let res: Response;
            try {
              res = await fetch(`/api/events/${slug}/checkout/create-order`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...payload, turnstileToken: token }),
              });
            } finally {
              // The token is spent either way; fetch a new one for any retry.
              freshTurnstile();
            }
            const body = await res.json().catch(() => ({}));
            if (!res.ok || !body.orderId) {
              setErrorMessage(body.error ?? "Unable to start checkout. Please try again.");
              explainedRef.current = true;
              throw new Error(body.error ?? "Failed to create order");
            }
            return body.orderId as string;
          }}
          onApprove={async (data: OnApproveData, actions: OnApproveActions) => {
            const res = await fetch(`/api/events/${slug}/checkout/capture`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ orderId: data.orderID }),
            });
            const body = await res.json().catch(() => ({}));

            if (res.status === 409 && body.error === "INSTRUMENT_DECLINED") {
              return actions.restart();
            }
            if (res.status === 202 && body.processing) {
              setNotice(body.message);
              return;
            }
            if (!res.ok) {
              setErrorMessage(body.error ?? "We couldn't complete your payment. You have not been charged.");
              return;
            }
            onSuccessRef.current({
              kind: body.kind,
              amountCents: body.amountCents,
              quantity: body.quantity ?? null,
              tierName: body.tierName ?? null,
              email: body.email ?? null,
            });
          }}
          onCancel={() => {
            setErrorMessage("Checkout was cancelled. You have not been charged.");
          }}
          onError={() => {
            if (explainedRef.current) return;
            setErrorMessage("Something went wrong with PayPal checkout. Please try again.");
          }}
        />

      <p className="text-center text-xs text-on-surface-variant">
        Secure checkout by PayPal. Pay with a PayPal account or any debit or credit card. We never see your card
        number.
      </p>
    </div>
  );
}
