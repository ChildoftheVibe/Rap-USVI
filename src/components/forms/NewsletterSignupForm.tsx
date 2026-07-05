"use client";

import { useState } from "react";
import Script from "next/script";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { newsletterSignupSchema, type NewsletterSignupInput } from "@/lib/validation/newsletter";
import { useTurnstile } from "@/lib/useTurnstile";

type SubmitState = "idle" | "submitting" | "success" | "error";

export function NewsletterSignupForm() {
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
  } = useForm<NewsletterSignupInput>({
    resolver: zodResolver(newsletterSignupSchema),
    defaultValues: { email: "", company: "", turnstileToken: "" },
  });

  const turnstileContainerRef = useTurnstile(siteKey, (token) => {
    setTurnstileToken(token);
    setValue("turnstileToken", token);
  });

  async function onSubmit(data: NewsletterSignupInput) {
    if (!turnstileToken) {
      setErrorMessage("Please complete the verification check above, then try again.");
      setState("error");
      return;
    }
    setState("submitting");
    setErrorMessage("");
    try {
      const res = await fetch("/api/newsletter-signup", {
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
      <div className="py-6 text-center">
        <h3 className="mb-2 font-[family-name:var(--font-headline)] text-lg text-primary">
          You&apos;re on the list
        </h3>
        <p className="text-on-surface-variant">We&apos;ll keep you posted on how to get involved.</p>
      </div>
    );
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit(onSubmit)} noValidate>
      {/* Honeypot — hidden from sighted users and keyboard tab order, but present in the DOM for bots */}
      <div className="absolute left-[-9999px]" aria-hidden="true">
        <label htmlFor="newsletter-company">Company</label>
        <input
          id="newsletter-company"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          {...register("company")}
        />
      </div>

      <div>
        <label htmlFor="newsletter-email" className="mb-2 block font-medium text-on-surface-variant">
          EMAIL ADDRESS
        </label>
        <input
          id="newsletter-email"
          type="email"
          className="w-full rounded-sm border border-outline-variant bg-surface px-4 py-3 outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary"
          {...register("email")}
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? "newsletter-email-error" : undefined}
        />
        {errors.email && (
          <p id="newsletter-email-error" className="mt-1 text-sm text-error">
            {errors.email.message}
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
        {state === "submitting" ? "Signing up…" : "Join the Movement"}
      </button>
    </form>
  );
}
