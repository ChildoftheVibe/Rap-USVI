import type { InterestArea } from "@/lib/content";

export const CONTACT_INTEREST_EVENT = "rap:contact-interest";
const PENDING_INTEREST_KEY = "rap:pending-contact-interest";

/**
 * Scrolls to the Stakeholder Inquiry form and pre-selects an interest area.
 * Used by the Donate and Inquire About Enrollment CTAs so both funnel into
 * the one existing form instead of needing dedicated flows. Swapping Donate
 * for a real payment processor later only means changing DonateButton's
 * onClick — this helper and the form itself don't need to change.
 *
 * The Contact section only exists on the homepage. From any other page,
 * stash the interest and navigate to "/#contact" instead — the homepage
 * form picks it up on mount via `consumePendingContactInterest`.
 */
export function scrollToContactWithInterest(interest: InterestArea): void {
  const contact = document.getElementById("contact");
  if (!contact) {
    sessionStorage.setItem(PENDING_INTEREST_KEY, interest);
    window.location.href = "/#contact";
    return;
  }
  window.dispatchEvent(
    new CustomEvent<InterestArea>(CONTACT_INTEREST_EVENT, { detail: interest })
  );
  contact.scrollIntoView({ behavior: "smooth" });
}

/** Reads and clears an interest area stashed by `scrollToContactWithInterest` before a cross-page navigation. */
export function consumePendingContactInterest(): InterestArea | null {
  const value = sessionStorage.getItem(PENDING_INTEREST_KEY);
  if (value) sessionStorage.removeItem(PENDING_INTEREST_KEY);
  return (value as InterestArea | null) ?? null;
}
