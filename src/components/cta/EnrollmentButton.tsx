"use client";

import { scrollToContactWithInterest } from "@/lib/scrollToContact";

export function EnrollmentButton() {
  return (
    <button
      type="button"
      onClick={() => scrollToContactWithInterest("academy_enrollment")}
      className="btn btn-lg btn-gold w-full shadow-lg sm:w-max"
    >
      Inquire About Enrollment
    </button>
  );
}
