"use client";

import { useEffect, useRef, useState, type TouchEvent as ReactTouchEvent } from "react";
import Script from "next/script";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { volunteerSchema, type VolunteerInput } from "@/lib/validation/volunteer";
import {
  availabilityDays,
  availabilityHoursOptions,
  commitmentLevels,
  certificationOptions,
} from "@/lib/content";
import { useTurnstile } from "@/lib/useTurnstile";

const OPEN_EVENT = "rap:open-volunteer-modal";
const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2";
const SWIPE_THRESHOLD_PX = 50;

export function openVolunteerModal(): void {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

type StepId = "contact" | "industry" | "availability" | "skills" | "review";

const STEPS: { id: StepId; title: string; fields: (keyof VolunteerInput)[] }[] = [
  { id: "contact", title: "Contact Information", fields: ["fullName", "phone", "email"] },
  { id: "industry", title: "Industry", fields: ["industry"] },
  {
    id: "availability",
    title: "Availability & Schedule Preferences",
    fields: ["availabilityDays", "availabilityHours", "commitmentLevel"],
  },
  {
    id: "skills",
    title: "Skills, Experience & Certifications",
    fields: ["skillsExperience", "certifications"],
  },
  { id: "review", title: "Review & Submit", fields: [] },
];

const STEP_SPEECH: Record<StepId, string> = {
  contact:
    "Contact information. Please provide your full name, phone number, and email address.",
  industry: "Industry. Tell us what industry or field you work in.",
  availability:
    "Availability and schedule preferences. Choose the days you're available, your preferred hours, and how often you'd like to commit.",
  skills:
    "Skills, experience, and certifications. Describe relevant skills or experience, and check any certifications you hold, such as CPR or First Aid.",
  review: "Review your answers, then submit the form to complete your volunteer sign-up.",
};

type SubmitState = "idle" | "submitting" | "success" | "error";

function inputClass(hasError: boolean) {
  return `w-full rounded-sm border bg-surface px-4 py-3 outline-none transition-all focus:ring-1 ${FOCUS_RING} ${
    hasError ? "border-error focus:border-error focus:ring-error" : "border-outline-variant focus:border-primary focus:ring-primary"
  }`;
}

export function VolunteerIntakeModal() {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [state, setState] = useState<SubmitState>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [speaking, setSpeaking] = useState(false);

  const dialogRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);

  const {
    register,
    handleSubmit,
    trigger,
    setValue,
    getValues,
    reset,
    formState: { errors },
  } = useForm<VolunteerInput>({
    resolver: zodResolver(volunteerSchema),
    defaultValues: {
      fullName: "",
      phone: "",
      email: "",
      industry: "",
      availabilityDays: [],
      availabilityHours: undefined,
      commitmentLevel: undefined,
      skillsExperience: "",
      certifications: [],
      company: "",
      turnstileToken: "",
    },
  });

  const turnstileContainerRef = useTurnstile(siteKey, (token) => {
    setTurnstileToken(token);
    setValue("turnstileToken", token);
  });

  useEffect(() => {
    function handleOpen() {
      setOpen(true);
      setStep(0);
      setState("idle");
      setErrorMessage("");
    }
    window.addEventListener(OPEN_EVENT, handleOpen);
    return () => window.removeEventListener(OPEN_EVENT, handleOpen);
  }, []);

  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        close();
        return;
      }
      if (e.key === "Tab") {
        const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (!focusable || focusable.length === 0) return;
        const first = focusable[0]!;
        const last = focusable[focusable.length - 1]!;
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  // Move focus to the step heading whenever the visible step changes, and
  // announce it via the aria-live region below so screen-reader users know
  // navigation happened without needing to re-explore the dialog.
  useEffect(() => {
    if (!open) return;
    const heading = dialogRef.current?.querySelector<HTMLElement>("[data-step-heading]");
    heading?.focus();
    // Cancelling mid-utterance fires the utterance's onerror callback, which
    // sets `speaking` back to false — no separate setState needed here.
    window.speechSynthesis?.cancel();
  }, [step, open]);

  function close() {
    setOpen(false);
    window.speechSynthesis?.cancel();
    setSpeaking(false);
  }

  async function goNext() {
    const fields = STEPS[step]!.fields;
    const valid = fields.length === 0 || (await trigger(fields));
    if (!valid) return;
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function goBack() {
    setStep((s) => Math.max(s - 1, 0));
  }

  function handleTouchStart(e: ReactTouchEvent<HTMLDivElement>) {
    touchStartX.current = e.touches[0]?.clientX ?? null;
  }

  function handleTouchEnd(e: ReactTouchEvent<HTMLDivElement>) {
    if (touchStartX.current === null) return;
    const endX = e.changedTouches[0]?.clientX ?? touchStartX.current;
    const delta = endX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(delta) < SWIPE_THRESHOLD_PX) return;
    if (delta < 0) {
      goNext();
    } else {
      goBack();
    }
  }

  function toggleReadAloud() {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(STEP_SPEECH[STEPS[step]!.id]);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    setSpeaking(true);
  }

  async function onSubmit(data: VolunteerInput) {
    if (!turnstileToken) {
      setErrorMessage("Please complete the verification check above, then try again.");
      setState("error");
      return;
    }
    setState("submitting");
    setErrorMessage("");
    try {
      const res = await fetch("/api/volunteers", {
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

  if (!open) return null;

  const ttsSupported = typeof window !== "undefined" && !!window.speechSynthesis;
  const values = getValues();
  const currentStep = STEPS[step]!;
  const isFirstStep = step === 0;
  const isLastStep = step === STEPS.length - 1;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Volunteer Sign-up"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
      onClick={close}
    >
      <div
        ref={dialogRef}
        className="w-full max-w-lg overflow-hidden rounded-lg bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-outline-variant px-8 py-6">
          <div>
            <h2 className="font-[family-name:var(--font-headline)] text-xl text-primary">
              Volunteer Sign-up
            </h2>
            <ol aria-label="Form progress" className="mt-2 flex items-center gap-1.5">
              {STEPS.map((s, i) => (
                <li key={s.id} className="list-none">
                  <span
                    aria-current={i === step ? "step" : undefined}
                    aria-label={`Step ${i + 1} of ${STEPS.length}: ${s.title}${i === step ? " (current)" : ""}`}
                    className={`block h-1.5 w-6 rounded-full transition-colors ${
                      i === step ? "bg-primary" : i < step ? "bg-primary/40" : "bg-outline-variant"
                    }`}
                  />
                </li>
              ))}
            </ol>
          </div>
          <div className="flex items-center gap-1">
            {ttsSupported && (
              <button
                type="button"
                onClick={toggleReadAloud}
                aria-pressed={speaking}
                aria-label={speaking ? "Stop reading this step aloud" : "Read this step aloud"}
                className={`flex h-11 w-11 items-center justify-center rounded-md text-on-surface-variant transition-colors hover:text-primary ${FOCUS_RING}`}
              >
                <span className="material-symbols-outlined" aria-hidden="true">
                  {speaking ? "stop_circle" : "volume_up"}
                </span>
              </button>
            )}
            <button
              type="button"
              onClick={close}
              aria-label="Close"
              className={`flex h-11 w-11 items-center justify-center rounded-md text-on-surface-variant transition-colors hover:text-primary ${FOCUS_RING}`}
            >
              <span className="material-symbols-outlined" aria-hidden="true">
                close
              </span>
            </button>
          </div>
        </div>

        <div aria-live="polite" className="sr-only">
          Step {step + 1} of {STEPS.length}: {currentStep.title}
        </div>

        {state === "success" ? (
          <div className="p-10 text-center">
            <h3 className="mb-2 font-[family-name:var(--font-headline)] text-xl text-primary">
              Thank you for volunteering!
            </h3>
            <p className="text-on-surface-variant">
              We&apos;ve received your sign-up and someone from our team will follow up soon.
            </p>
            <button type="button" onClick={close} className="btn btn-primary mt-6">
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            {/* Honeypot — hidden from sighted users and keyboard tab order, but present in the DOM for bots */}
            <div className="absolute left-[-9999px]" aria-hidden="true">
              <label htmlFor="volunteer-company">Company</label>
              <input id="volunteer-company" type="text" tabIndex={-1} autoComplete="off" {...register("company")} />
            </div>

            <div
              className="touch-pan-y px-8 py-6"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              <h3
                data-step-heading
                tabIndex={-1}
                className="mb-6 font-[family-name:var(--font-headline)] text-lg text-on-surface focus:outline-none"
              >
                {step + 1}. {currentStep.title}
              </h3>

              {currentStep.id === "contact" && (
                <div className="space-y-5">
                  <div>
                    <label htmlFor="v-fullName" className="mb-2 block font-medium text-on-surface-variant">
                      FULL NAME
                    </label>
                    <input
                      id="v-fullName"
                      type="text"
                      className={inputClass(!!errors.fullName)}
                      {...register("fullName")}
                      aria-invalid={!!errors.fullName}
                      aria-describedby={errors.fullName ? "v-fullName-error" : undefined}
                    />
                    {errors.fullName && (
                      <p id="v-fullName-error" className="mt-1 text-sm text-error">
                        {errors.fullName.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="v-phone" className="mb-2 block font-medium text-on-surface-variant">
                      PHONE NUMBER
                    </label>
                    <input
                      id="v-phone"
                      type="tel"
                      className={inputClass(!!errors.phone)}
                      {...register("phone")}
                      aria-invalid={!!errors.phone}
                      aria-describedby={errors.phone ? "v-phone-error" : undefined}
                    />
                    {errors.phone && (
                      <p id="v-phone-error" className="mt-1 text-sm text-error">
                        {errors.phone.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="v-email" className="mb-2 block font-medium text-on-surface-variant">
                      EMAIL ADDRESS
                    </label>
                    <input
                      id="v-email"
                      type="email"
                      className={inputClass(!!errors.email)}
                      {...register("email")}
                      aria-invalid={!!errors.email}
                      aria-describedby={errors.email ? "v-email-error" : undefined}
                    />
                    {errors.email && (
                      <p id="v-email-error" className="mt-1 text-sm text-error">
                        {errors.email.message}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {currentStep.id === "industry" && (
                <div>
                  <label htmlFor="v-industry" className="mb-2 block font-medium text-on-surface-variant">
                    WHAT INDUSTRY DO YOU WORK IN?
                  </label>
                  <input
                    id="v-industry"
                    type="text"
                    placeholder="e.g. Healthcare, Education, Construction"
                    className={inputClass(!!errors.industry)}
                    {...register("industry")}
                    aria-invalid={!!errors.industry}
                    aria-describedby={errors.industry ? "v-industry-error" : undefined}
                  />
                  {errors.industry && (
                    <p id="v-industry-error" className="mt-1 text-sm text-error">
                      {errors.industry.message}
                    </p>
                  )}
                </div>
              )}

              {currentStep.id === "availability" && (
                <div className="space-y-6">
                  <fieldset>
                    <legend className="mb-2 block font-medium text-on-surface-variant">
                      WHICH DAYS ARE YOU AVAILABLE?
                    </legend>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {availabilityDays.map((day) => (
                        <label key={day.value} className="flex items-center gap-2 text-sm text-on-surface">
                          <input
                            type="checkbox"
                            value={day.value}
                            className={`h-4 w-4 rounded-sm border-outline-variant text-primary ${FOCUS_RING}`}
                            {...register("availabilityDays")}
                          />
                          {day.label}
                        </label>
                      ))}
                    </div>
                    {errors.availabilityDays && (
                      <p role="alert" className="mt-1 text-sm text-error">
                        {errors.availabilityDays.message}
                      </p>
                    )}
                  </fieldset>

                  <fieldset>
                    <legend className="mb-2 block font-medium text-on-surface-variant">
                      PREFERRED HOURS
                    </legend>
                    <div className="space-y-2">
                      {availabilityHoursOptions.map((opt) => (
                        <label key={opt.value} className="flex items-center gap-2 text-sm text-on-surface">
                          <input
                            type="radio"
                            value={opt.value}
                            className={`h-4 w-4 border-outline-variant text-primary ${FOCUS_RING}`}
                            {...register("availabilityHours")}
                          />
                          {opt.label}
                        </label>
                      ))}
                    </div>
                    {errors.availabilityHours && (
                      <p role="alert" className="mt-1 text-sm text-error">
                        {errors.availabilityHours.message}
                      </p>
                    )}
                  </fieldset>

                  <fieldset>
                    <legend className="mb-2 block font-medium text-on-surface-variant">
                      COMMITMENT LEVEL
                    </legend>
                    <div className="space-y-2">
                      {commitmentLevels.map((opt) => (
                        <label key={opt.value} className="flex items-center gap-2 text-sm text-on-surface">
                          <input
                            type="radio"
                            value={opt.value}
                            className={`h-4 w-4 border-outline-variant text-primary ${FOCUS_RING}`}
                            {...register("commitmentLevel")}
                          />
                          {opt.label}
                        </label>
                      ))}
                    </div>
                    {errors.commitmentLevel && (
                      <p role="alert" className="mt-1 text-sm text-error">
                        {errors.commitmentLevel.message}
                      </p>
                    )}
                  </fieldset>
                </div>
              )}

              {currentStep.id === "skills" && (
                <div className="space-y-6">
                  <div>
                    <label htmlFor="v-skills" className="mb-2 block font-medium text-on-surface-variant">
                      SKILLS &amp; EXPERIENCE (OPTIONAL)
                    </label>
                    <textarea
                      id="v-skills"
                      rows={4}
                      placeholder="Tell us about relevant skills, past volunteer work, or experience"
                      className={inputClass(!!errors.skillsExperience)}
                      {...register("skillsExperience")}
                      aria-invalid={!!errors.skillsExperience}
                      aria-describedby={errors.skillsExperience ? "v-skills-error" : undefined}
                    />
                    {errors.skillsExperience && (
                      <p id="v-skills-error" className="mt-1 text-sm text-error">
                        {errors.skillsExperience.message}
                      </p>
                    )}
                  </div>
                  <fieldset>
                    <legend className="mb-2 block font-medium text-on-surface-variant">
                      CERTIFICATIONS (OPTIONAL)
                    </legend>
                    <div className="space-y-2">
                      {certificationOptions.map((opt) => (
                        <label key={opt.value} className="flex items-center gap-2 text-sm text-on-surface">
                          <input
                            type="checkbox"
                            value={opt.value}
                            className={`h-4 w-4 rounded-sm border-outline-variant text-primary ${FOCUS_RING}`}
                            {...register("certifications")}
                          />
                          {opt.label}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                </div>
              )}

              {currentStep.id === "review" && (
                <div className="space-y-3 text-sm">
                  <ReviewRow label="Name" value={values.fullName} />
                  <ReviewRow label="Phone" value={values.phone} />
                  <ReviewRow label="Email" value={values.email} />
                  <ReviewRow label="Industry" value={values.industry} />
                  <ReviewRow
                    label="Available days"
                    value={values.availabilityDays
                      ?.map((d) => availabilityDays.find((a) => a.value === d)?.label ?? d)
                      .join(", ")}
                  />
                  <ReviewRow
                    label="Preferred hours"
                    value={availabilityHoursOptions.find((h) => h.value === values.availabilityHours)?.label}
                  />
                  <ReviewRow
                    label="Commitment level"
                    value={commitmentLevels.find((c) => c.value === values.commitmentLevel)?.label}
                  />
                  {values.skillsExperience && <ReviewRow label="Skills & experience" value={values.skillsExperience} />}
                  {!!values.certifications?.length && (
                    <ReviewRow
                      label="Certifications"
                      value={values.certifications
                        .map((c) => certificationOptions.find((o) => o.value === c)?.label ?? c)
                        .join(", ")}
                    />
                  )}

                  {state === "error" && (
                    <p role="alert" className="text-sm text-error">
                      {errorMessage}
                    </p>
                  )}
                </div>
              )}

              {/* Always mounted (not conditionally rendered) so the ref is
                  attached before useTurnstile's effect runs; only shown on
                  the review step, where the actual submit happens. */}
              {siteKey && (
                <div className={currentStep.id === "review" ? "pt-4" : "hidden"}>
                  <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="afterInteractive" />
                  <div ref={turnstileContainerRef} />
                </div>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-outline-variant px-8 py-5">
              <button
                type="button"
                onClick={goBack}
                disabled={isFirstStep}
                className={`btn btn-sm border border-outline-variant text-on-surface-variant disabled:cursor-not-allowed disabled:opacity-40 ${FOCUS_RING}`}
              >
                Back
              </button>
              {isLastStep ? (
                <button
                  type="submit"
                  disabled={state === "submitting"}
                  className={`btn btn-lg btn-primary ${FOCUS_RING}`}
                >
                  {state === "submitting" ? "Submitting…" : "Submit"}
                </button>
              ) : (
                <button type="button" onClick={goNext} className={`btn btn-lg btn-primary ${FOCUS_RING}`}>
                  Next
                </button>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string | undefined }) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-0.5 border-b border-outline-variant pb-2">
      <span className="text-xs font-medium uppercase tracking-wide text-on-surface-variant">{label}</span>
      <span className="text-on-surface">{value}</span>
    </div>
  );
}
