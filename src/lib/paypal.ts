const TOKEN_SAFETY_MARGIN_MS = 60_000;

let cachedToken: { token: string; expiresAt: number } | null = null;

function getPayPalApiBase(): string {
  return process.env.PAYPAL_ENV === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
}

function getCredentials(): { clientId: string; clientSecret: string } {
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("PayPal env vars are not configured (NEXT_PUBLIC_PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET)");
  }
  return { clientId, clientSecret };
}

/** Client-credentials OAuth token, cached at module scope (tokens last ~9h). */
async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + TOKEN_SAFETY_MARGIN_MS) {
    return cachedToken.token;
  }

  const { clientId, clientSecret } = getCredentials();
  const res = await fetch(`${getPayPalApiBase()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    throw new Error(`PayPal OAuth token request failed (${res.status})`);
  }

  const data: { access_token: string; expires_in: number } = await res.json();
  cachedToken = { token: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return cachedToken.token;
}

async function paypalFetch<T>(path: string, init: RequestInit & { requestId?: string }): Promise<T> {
  const token = await getAccessToken();
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    ...(init.requestId ? { "PayPal-Request-Id": init.requestId } : {}),
  };

  const res = await fetch(`${getPayPalApiBase()}${path}`, { ...init, headers });
  const body = await res.json().catch(() => null);

  if (!res.ok) {
    const issue = body?.details?.[0]?.issue;
    const error = new Error(issue ?? body?.message ?? `PayPal request failed (${res.status})`) as Error & {
      status: number;
      issue?: string;
    };
    error.status = res.status;
    error.issue = issue;
    throw error;
  }

  return body as T;
}

interface CreateOrderResult {
  id: string;
}

/** The server-stored amount is the only amount ever sent to PayPal — the order total can't be tampered with client-side. */
export async function createPayPalOrder({
  donationId,
  amountCents,
}: {
  donationId: string;
  amountCents: number;
}): Promise<CreateOrderResult> {
  return paypalFetch<CreateOrderResult>("/v2/checkout/orders", {
    method: "POST",
    requestId: donationId,
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: donationId,
          custom_id: donationId,
          description: "Donation to Restore America's Paradise, Inc.",
          amount: {
            currency_code: "USD",
            value: (amountCents / 100).toFixed(2),
          },
        },
      ],
    }),
  });
}

interface CaptureResult {
  id: string;
  status: string;
  purchase_units: {
    payments: {
      captures: {
        id: string;
        status: string;
        amount: { value: string; currency_code: string };
      }[];
    };
  }[];
  payer?: {
    payer_id?: string;
    email_address?: string;
    name?: { given_name?: string; surname?: string };
  };
}

export async function capturePayPalOrder(orderId: string): Promise<CaptureResult> {
  return paypalFetch<CaptureResult>(`/v2/checkout/orders/${orderId}/capture`, {
    method: "POST",
    requestId: `capture-${orderId}`,
    body: "{}",
  });
}

/**
 * Verifies a webhook payload came from PayPal using PayPal's own verification
 * API rather than implementing cert-chain signature checking ourselves.
 */
export async function verifyPayPalWebhookSignature({
  headers,
  event,
}: {
  headers: Headers;
  event: unknown;
}): Promise<boolean> {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) return false;

  const transmissionId = headers.get("paypal-transmission-id");
  const transmissionTime = headers.get("paypal-transmission-time");
  const transmissionSig = headers.get("paypal-transmission-sig");
  const certUrl = headers.get("paypal-cert-url");
  const authAlgo = headers.get("paypal-auth-algo");
  if (!transmissionId || !transmissionTime || !transmissionSig || !certUrl || !authAlgo) {
    return false;
  }

  const result = await paypalFetch<{ verification_status: string }>("/v1/notifications/verify-webhook-signature", {
    method: "POST",
    body: JSON.stringify({
      transmission_id: transmissionId,
      transmission_time: transmissionTime,
      transmission_sig: transmissionSig,
      cert_url: certUrl,
      auth_algo: authAlgo,
      webhook_id: webhookId,
      webhook_event: event,
    }),
  });

  return result.verification_status === "SUCCESS";
}
