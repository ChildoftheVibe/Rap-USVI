"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
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
  // Turnstile tokens work once. Each checkout attempt remounts the widget so
  // a buyer who closes the PayPal window can simply try again.
  const [turnstileRound, setTurnstileRound] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");

  const tokenRef = useRef(turnstileToken);
  const getPayloadRef = useRef(getPayload);
  useEffect(() => {
    tokenRef.current = turnstileToken;
    getPayloadRef.current = getPayload;
  });

  if (!clientId) {
    return (
      <p className="text-sm text-on-surface-variant">
        Online payment is temporarily unavailable. Please contact us and we&apos;ll help you another way.
      </p>
    );
  }

  const canPay = ready && (!turnstileSiteKey || !!turnstileToken);

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

      <PayPalScriptProvider options={{ clientId, currency: "USD", intent: "capture" }}>
        <PayPalButtons
          style={{ layout: "vertical", label: "pay" }}
          disabled={!canPay}
          forceReRender={[canPay]}
          createOrder={async () => {
            setErrorMessage("");
            const payload = getPayloadRef.current();
            if (!payload) {
              setErrorMessage("Please fill in the form above first.");
              throw new Error("Form incomplete");
            }
            const token = tokenRef.current;
            if (turnstileSiteKey) {
              setTurnstileToken("");
              setTurnstileRound((n) => n + 1);
            }
            const res = await fetch(`/api/events/${slug}/checkout/create-order`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ...payload, turnstileToken: token }),
            });
            const body = await res.json().catch(() => ({}));
            if (!res.ok || !body.orderId) {
              setErrorMessage(body.error ?? "Unable to start checkout. Please try again.");
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
            if (!res.ok) {
              setErrorMessage(body.error ?? "We couldn't complete your payment. You have not been charged.");
              return;
            }
            onSuccess({
              kind: body.kind,
              amountCents: body.amountCents,
              quantity: body.quantity ?? null,
              tierName: body.tierName ?? null,
              email: body.email ?? null,
            });
          }}
          onError={() => {
            setErrorMessage("Something went wrong with PayPal checkout. Please try again.");
          }}
        />
      </PayPalScriptProvider>

      <p className="text-center text-xs text-on-surface-variant">
        Secure checkout by PayPal. Pay with a PayPal account or any debit or credit card. We never see your card
        number.
      </p>
    </div>
  );
}
