"use client";

import { scrollToContactWithInterest } from "@/lib/scrollToContact";

export function EnrollmentButton() {
  return (
    <button
      type="button"
      onClick={() => scrollToContactWithInterest("academy_enrollment")}
      className="w-max rounded-lg bg-harvest-gold px-10 py-4 font-medium text-primary shadow-lg transition-all hover:brightness-110"
    >
      Inquire About Enrollment
    </button>
  );
}
