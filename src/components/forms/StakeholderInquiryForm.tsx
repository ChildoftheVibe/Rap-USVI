"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { inquirySchema, type InquiryInput } from "@/lib/validation/inquiry";
import { interestAreas } from "@/lib/content";
import { CONTACT_INTEREST_EVENT } from "@/lib/scrollToContact";
import type { InterestArea } from "@/lib/content";
import { useTurnstile } from "@/lib/useTurnstile";

type SubmitState = "idle" | "submitting" | "success" | "error";

export function StakeholderInquiryForm() {
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
  } = useForm<InquiryInput>({
    resolver: zodResolver(inquirySchema),
    defaultValues: {
      fullName: "",
      email: "",
      interestArea: "corporate_sponsorship",
      message: "",
      company: "",
      turnstileToken: "",
    },
  });

  const turnstileContainerRef = useTurnstile(siteKey, (token) => {
    setTurnstileToken(token);
    setValue("turnstileToken", token);
  });

  useEffect(() => {
    function handlePreset(e: Event) {
      const detail = (e as CustomEvent<InterestArea>).detail;
      if (detail) setValue("interestArea", detail);
    }
    window.addEventListener(CONTACT_INTEREST_EVENT, handlePreset);
    return () => window.removeEventListener(CONTACT_INTEREST_EVENT, handlePreset);
  }, [setValue]);

  async function onSubmit(data: InquiryInput) {
    if (!turnstileToken) {
      setErrorMessage("Please complete the verification check above, then try again.");
      setState("error");
      return;
    }
    setState("submitting");
    setErrorMessage("");
    try {
      const res = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, turnstileToken }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setErrorMessage(body.error ?? "Something went wrong. Please try again.");
        setState("error");
        return;
      }
      setState("success");
      reset();
    } catch {
      setErrorMessage("Network error. Please try again.");
      setState("error");
    }
  }

  if (state === "success") {
    return (
      <div className="rounded-lg border border-outline-variant bg-white p-10 text-center shadow-xl">
        <h3 className="mb-2 font-[family-name:var(--font-headline)] text-xl text-primary">Thank you</h3>
        <p className="text-on-surface-variant">
          Your inquiry has been received. Our team will follow up soon.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-outline-variant bg-white p-10 shadow-xl">
      <h3 className="mb-8 font-[family-name:var(--font-headline)] text-xl text-primary">
        Stakeholder Inquiry
      </h3>
      <form className="space-y-6" onSubmit={handleSubmit(onSubmit)} noValidate>
        {/* Honeypot — hidden from sighted users and keyboard tab order, but present in the DOM for bots */}
        <div className="absolute left-[-9999px]" aria-hidden="true">
          <label htmlFor="company">Company</label>
          <input id="company" type="text" tabIndex={-1} autoComplete="off" {...register("company")} />
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <label htmlFor="fullName" className="mb-2 block font-medium text-on-surface-variant">
              FULL NAME
            </label>
            <input
              id="fullName"
              type="text"
              className="w-full rounded-sm border border-outline-variant bg-surface px-4 py-3 outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary"
              {...register("fullName")}
              aria-invalid={!!errors.fullName}
              aria-describedby={errors.fullName ? "fullName-error" : undefined}
            />
            {errors.fullName && (
              <p id="fullName-error" className="mt-1 text-sm text-error">
                {errors.fullName.message}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="email" className="mb-2 block font-medium text-on-surface-variant">
              EMAIL ADDRESS
            </label>
            <input
              id="email"
              type="email"
              className="w-full rounded-sm border border-outline-variant bg-surface px-4 py-3 outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary"
              {...register("email")}
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? "email-error" : undefined}
            />
            {errors.email && (
              <p id="email-error" className="mt-1 text-sm text-error">
                {errors.email.message}
              </p>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="interestArea" className="mb-2 block font-medium text-on-surface-variant">
            INTEREST AREA
          </label>
          <select
            id="interestArea"
            className="w-full rounded-sm border border-outline-variant bg-surface px-4 py-3 outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary"
            {...register("interestArea")}
          >
            {interestAreas.map((area) => (
              <option key={area.value} value={area.value}>
                {area.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="message" className="mb-2 block font-medium text-on-surface-variant">
            MESSAGE
          </label>
          <textarea
            id="message"
            rows={4}
            className="w-full rounded-sm border border-outline-variant bg-surface px-4 py-3 outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary"
            {...register("message")}
            aria-invalid={!!errors.message}
            aria-describedby={errors.message ? "message-error" : undefined}
          />
          {errors.message && (
            <p id="message-error" className="mt-1 text-sm text-error">
              {errors.message.message}
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

        <button
          type="submit"
          disabled={state === "submitting"}
          className="w-full rounded-lg bg-primary py-4 font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {state === "submitting" ? "Submitting…" : "Submit Inquiry"}
        </button>
      </form>
    </div>
  );
}
