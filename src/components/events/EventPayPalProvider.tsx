"use client";

import type { ReactNode } from "react";
import { PayPalScriptProvider } from "@paypal/react-paypal-js";

/**
 * Loads the PayPal SDK once for the whole event page, so the ticket box and
 * the sponsor form share one copy instead of each loading their own.
 */
export function EventPayPalProvider({ enabled, children }: { enabled: boolean; children: ReactNode }) {
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
  // Free events with no sponsors never load PayPal's script.
  if (!enabled || !clientId) return <>{children}</>;
  return (
    <PayPalScriptProvider options={{ clientId, currency: "USD", intent: "capture" }}>{children}</PayPalScriptProvider>
  );
}
