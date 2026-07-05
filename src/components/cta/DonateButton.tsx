"use client";

import { scrollToContactWithInterest } from "@/lib/scrollToContact";

export function DonateButton({ className }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() => scrollToContactWithInterest("donation_inquiry")}
      className={className ?? "rounded-lg bg-harvest-gold px-6 py-2 font-medium text-primary transition-all active:scale-95"}
    >
      Donate
    </button>
  );
}
