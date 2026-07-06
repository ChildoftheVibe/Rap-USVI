"use client";

import { useState } from "react";
import Script from "next/script";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { rsvpSchema, type RsvpInput } from "@/lib/validation/rsvp";
import { useTurnstile } from "@/lib/useTurnstile";

type SubmitState = "idle" | "submitting" | "confirmed" | "waitlisted" | "error";

interface EventRsvpFormProps {
  slug: string;
  capacity: number | null;
  spotsLeft: number | null;
  isFull: boolean;
  waitlistEnabled: boolean;
}

const FIELD_CLASS =
  "w-full rounded-sm border border-outline-variant bg-surface px-4 py-3 outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary";

export function EventRsvpForm({ slug, capacity, spotsLeft, isFull, waitlistEnabled }: EventRsvpFormProps) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const [turnstileToken, setTurnstileToken] = useState("");
  const [state, setState] = useState<SubmitState>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<RsvpInput>({
    resolver: zodResolver(rsvpSchema),
    defaultValues: { fullName: "", email: "", phone: "", guestCount: 0, company: "", turnstileToken: "" },
  });

  const turnstileContainerRef = useTurnstile(siteKey, (token) => {
    setTurnstileToken(token);
    setValue("turnstileToken", token);
  });

  async function onSubmit(data: RsvpInput) {
    if (!turnstileToken) {
      setErrorMessage("Please complete the verification check above, then try again.");
      setState("error");
      return;
    }
    setState("submitting");
    setErrorMessage("");
    try {
      const res = await fetch(`/api/events/${slug}/rsvp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, turnstileToken }),
      });
      const responseBody = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorMessage(responseBody.error ?? "Something went wrong. Please try again.");
        setState("error");
        return;
      }
      setState(responseBody.status === "waitlisted" ? "waitlisted" : "confirmed");
      reset();
    } catch {
      setErrorMessage("Network error. Please try again.");
      setState("error");
    }
  }

  if (state === "confirmed") {
    return (
      <div className="rounded-lg border border-outline-variant bg-white p-8 text-center shadow-xl">
        <h3 className="mb-2 font-[family-name:var(--font-headline)] text-xl text-primary">You&apos;re confirmed!</h3>
        <p className="text-on-surface-variant">Check your email for confirmation details.</p>
      </div>
    );
  }

  if (state === "waitlisted") {
    return (
      <div className="rounded-lg border border-outline-variant bg-white p-8 text-center shadow-xl">
        <h3 className="mb-2 font-[family-name:var(--font-headline)] text-xl text-primary">You&apos;re on the waitlist</h3>
        <p className="text-on-surface-variant">
          This event is full. We&apos;ll email you right away if a spot opens up.
        </p>
      </div>
    );
  }

  if (isFull && !waitlistEnabled) {
    return (
      <div className="rounded-lg border border-outline-variant bg-white p-8 text-center shadow-xl">
        <h3 className="mb-2 font-[family-name:var(--font-headline)] text-xl text-primary">This event is full</h3>
        <p className="text-on-surface-variant">All spots have been claimed for this event.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-outline-variant bg-white p-8 shadow-xl">
      <h3 className="mb-2 font-[family-name:var(--font-headline)] text-xl text-primary">RSVP</h3>
      {capacity !== null && spotsLeft !== null && (
        <p className="mb-6 text-sm text-on-surface-variant">
          {isFull
            ? "This event is full — RSVPs will join the waitlist."
            : `${spotsLeft} of ${capacity} spot${capacity === 1 ? "" : "s"} remaining`}
        </p>
      )}
      <form className="space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
        {/* Honeypot — hidden from sighted users and keyboard tab order, but present in the DOM for bots */}
        <div className="absolute left-[-9999px]" aria-hidden="true">
          <label htmlFor="rsvp-company">Company</label>
          <input id="rsvp-company" type="text" tabIndex={-1} autoComplete="off" {...register("company")} />
        </div>

        <div>
          <label htmlFor="rsvp-fullName" className="mb-2 block text-sm font-medium text-on-surface-variant">
            FULL NAME
          </label>
          <input
            id="rsvp-fullName"
            type="text"
            className={FIELD_CLASS}
            {...register("fullName")}
            aria-invalid={!!errors.fullName}
            aria-describedby={errors.fullName ? "rsvp-fullName-error" : undefined}
          />
          {errors.fullName && (
            <p id="rsvp-fullName-error" className="mt-1 text-sm text-error">
              {errors.fullName.message}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="rsvp-email" className="mb-2 block text-sm font-medium text-on-surface-variant">
            EMAIL ADDRESS
          </label>
          <input
            id="rsvp-email"
            type="email"
            className={FIELD_CLASS}
            {...register("email")}
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? "rsvp-email-error" : undefined}
          />
          {errors.email && (
            <p id="rsvp-email-error" className="mt-1 text-sm text-error">
              {errors.email.message}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="rsvp-phone" className="mb-2 block text-sm font-medium text-on-surface-variant">
            PHONE (OPTIONAL)
          </label>
          <input id="rsvp-phone" type="tel" className={FIELD_CLASS} {...register("phone")} />
        </div>

        <div>
          <label htmlFor="rsvp-guestCount" className="mb-2 block text-sm font-medium text-on-surface-variant">
            ADDITIONAL GUESTS
          </label>
          <input
            id="rsvp-guestCount"
            type="number"
            min={0}
            max={19}
            className={FIELD_CLASS}
            {...register("guestCount", { valueAsNumber: true })}
            aria-invalid={!!errors.guestCount}
            aria-describedby={errors.guestCount ? "rsvp-guestCount-error" : undefined}
          />
          {errors.guestCount && (
            <p id="rsvp-guestCount-error" className="mt-1 text-sm text-error">
              {errors.guestCount.message}
            </p>
          )}
        </div>

        {siteKey && (
          <>
            <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="afterInteractive" />
            <div ref={turnstileContainerRef} />
          </>
        )}

        {state === "error" && <p className="text-sm text-error">{errorMessage}</p>}

        <button type="submit" disabled={state === "submitting"} className="btn btn-lg btn-primary w-full">
          {state === "submitting" ? "Submitting…" : isFull ? "Join Waitlist" : "RSVP Now"}
        </button>
      </form>
    </div>
  );
}
