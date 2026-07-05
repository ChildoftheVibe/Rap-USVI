import type { InterestArea } from "@/lib/content";

export const CONTACT_INTEREST_EVENT = "rap:contact-interest";

/**
 * Scrolls to the Stakeholder Inquiry form and pre-selects an interest area.
 * Used by the Donate and Inquire About Enrollment CTAs so both funnel into
 * the one existing form instead of needing dedicated flows. Swapping Donate
 * for a real payment processor later only means changing DonateButton's
 * onClick — this helper and the form itself don't need to change.
 */
export function scrollToContactWithInterest(interest: InterestArea): void {
  window.dispatchEvent(
    new CustomEvent<InterestArea>(CONTACT_INTEREST_EVENT, { detail: interest })
  );
  document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" });
}
