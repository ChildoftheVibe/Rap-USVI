"use client";

import { scrollToContactWithInterest } from "@/lib/scrollToContact";

export function DonateButton({ className }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() => scrollToContactWithInterest("donation_inquiry")}
      className={className ?? "btn btn-sm btn-gold"}
    >
      Donate
    </button>
  );
}
