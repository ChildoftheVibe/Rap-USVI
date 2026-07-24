export type DonationStatus = "pending" | "completed" | "failed" | "refunded";

export interface DonationRow {
  id: string;
  created_at: string;
  amount_cents: number;
  currency: string;
  status: DonationStatus;
  donor_name: string | null;
  donor_email: string | null;
  dedication: string | null;
  paypal_order_id: string | null;
  paypal_capture_id: string | null;
  payer_id: string | null;
  payer_email: string | null;
  payer_name: string | null;
  completed_at: string | null;
  refunded_at: string | null;
  receipt_sent_at: string | null;
  receipt_error: string | null;
  ip_hash: string | null;
  user_agent: string | null;
  source_page: string | null;
}

export const MIN_DONATION_CENTS = 500;
export const MAX_DONATION_CENTS = 2_500_000;

export function formatUsd(cents: number): string {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
}
