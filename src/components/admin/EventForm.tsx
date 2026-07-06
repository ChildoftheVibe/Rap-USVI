"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { createEvent, updateEvent, deleteEvent, uploadEventFlyer, removeEventFlyer } from "@/app/admin/events/actions";
import { slugify } from "@/lib/events";
import type { EventStatus } from "@/lib/validation/event";

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2";
const FIELD_CLASS =
  "w-full rounded-sm border border-outline-variant bg-surface px-4 py-2.5 outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary";
const LABEL_CLASS = "mb-2 block text-sm font-medium text-on-surface-variant";

export interface EventFormInitial {
  title: string;
  slug: string;
  description: string;
  locationName: string;
  locationAddress: string;
  startAt: string;
  endAt: string;
  status: EventStatus;
  capacity: number | null;
  waitlistEnabled: boolean;
  rsvpEnabled: boolean;
  flyerAlt: string;
  flyerUrl: string | null;
  popupEnabled: boolean;
  popupHeadline: string;
  popupBody: string;
  popupCtaLabel: string;
  popupStartsAt: string;
  popupEndsAt: string;
}

const DEFAULTS: EventFormInitial = {
  title: "",
  slug: "",
  description: "",
  locationName: "",
  locationAddress: "",
  startAt: "",
  endAt: "",
  status: "draft",
  capacity: null,
  waitlistEnabled: true,
  rsvpEnabled: true,
  flyerAlt: "",
  flyerUrl: null,
  popupEnabled: false,
  popupHeadline: "",
  popupBody: "",
  popupCtaLabel: "RSVP Now",
  popupStartsAt: "",
  popupEndsAt: "",
};

interface EventFormProps {
  mode: "new" | "edit";
  eventId?: string;
  initial?: EventFormInitial;
}

export function EventForm({ mode, eventId, initial }: EventFormProps) {
  const values = initial ?? DEFAULTS;

  const [title, setTitle] = useState(values.title);
  const [slug, setSlug] = useState(values.slug);
  const [slugTouched, setSlugTouched] = useState(mode === "edit");
  const [description, setDescription] = useState(values.description);
  const [locationName, setLocationName] = useState(values.locationName);
  const [locationAddress, setLocationAddress] = useState(values.locationAddress);
  const [startAt, setStartAt] = useState(values.startAt);
  const [endAt, setEndAt] = useState(values.endAt);
  const [status, setStatus] = useState<EventStatus>(values.status);
  const [capacity, setCapacity] = useState(values.capacity === null ? "" : String(values.capacity));
  const [waitlistEnabled, setWaitlistEnabled] = useState(values.waitlistEnabled);
  const [rsvpEnabled, setRsvpEnabled] = useState(values.rsvpEnabled);
  const [flyerAlt, setFlyerAlt] = useState(values.flyerAlt);
  const [flyerUrl, setFlyerUrl] = useState(values.flyerUrl);
  const [popupEnabled, setPopupEnabled] = useState(values.popupEnabled);
  const [popupHeadline, setPopupHeadline] = useState(values.popupHeadline);
  const [popupBody, setPopupBody] = useState(values.popupBody);
  const [popupCtaLabel, setPopupCtaLabel] = useState(values.popupCtaLabel);
  const [popupStartsAt, setPopupStartsAt] = useState(values.popupStartsAt);
  const [popupEndsAt, setPopupEndsAt] = useState(values.popupEndsAt);

  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [flyerError, setFlyerError] = useState("");
  const [isPending, startTransition] = useTransition();
  const [isFlyerPending, startFlyerTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleTitleChange(value: string) {
    setTitle(value);
    if (!slugTouched) setSlug(slugify(value));
  }

  function buildPayload() {
    return {
      title,
      slug,
      description,
      locationName,
      locationAddress,
      startAt,
      endAt,
      status,
      capacity: capacity.trim() === "" ? null : Number(capacity),
      waitlistEnabled,
      rsvpEnabled,
      flyerAlt,
      popupEnabled,
      popupHeadline,
      popupBody,
      popupCtaLabel,
      popupStartsAt,
      popupEndsAt,
    };
  }

  function handleSave() {
    setError("");
    setSaved(false);
    startTransition(async () => {
      try {
        if (mode === "new") {
          await createEvent(buildPayload());
        } else if (eventId) {
          await updateEvent(eventId, buildPayload());
          setSaved(true);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  function handleDelete() {
    if (!eventId) return;
    if (!window.confirm("Delete this event? All of its RSVPs will be deleted too. This can't be undone.")) return;
    setError("");
    startTransition(async () => {
      try {
        await deleteEvent(eventId);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  function handleFlyerUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !eventId) return;
    setFlyerError("");
    const formData = new FormData();
    formData.set("file", file);
    startFlyerTransition(async () => {
      try {
        const result = await uploadEventFlyer(eventId, formData);
        setFlyerUrl(result.url);
      } catch (err) {
        setFlyerError(err instanceof Error ? err.message : "Failed to upload image");
      }
    });
    e.target.value = "";
  }

  function handleFlyerRemove() {
    if (!eventId) return;
    setFlyerError("");
    startFlyerTransition(async () => {
      try {
        await removeEventFlyer(eventId);
        setFlyerUrl(null);
      } catch (err) {
        setFlyerError(err instanceof Error ? err.message : "Failed to remove image");
      }
    });
  }

  return (
    <div className="max-w-3xl space-y-8">
      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-on-surface-variant">Basic Info</h2>
        <div>
          <label htmlFor="ev-title" className={LABEL_CLASS}>
            TITLE
          </label>
          <input
            id="ev-title"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            className={FIELD_CLASS}
          />
        </div>
        <div>
          <label htmlFor="ev-slug" className={LABEL_CLASS}>
            SLUG (used in the URL: /events/…)
          </label>
          <input
            id="ev-slug"
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(slugify(e.target.value));
            }}
            className={`${FIELD_CLASS} font-mono text-sm`}
          />
        </div>
        <div>
          <label htmlFor="ev-description" className={LABEL_CLASS}>
            DESCRIPTION
          </label>
          <textarea
            id="ev-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
            className={FIELD_CLASS}
          />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-on-surface-variant">
          Schedule (America/St_Thomas — AST)
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="ev-start" className={LABEL_CLASS}>
              START
            </label>
            <input
              id="ev-start"
              type="datetime-local"
              value={startAt}
              onChange={(e) => setStartAt(e.target.value)}
              className={FIELD_CLASS}
            />
          </div>
          <div>
            <label htmlFor="ev-end" className={LABEL_CLASS}>
              END
            </label>
            <input
              id="ev-end"
              type="datetime-local"
              value={endAt}
              onChange={(e) => setEndAt(e.target.value)}
              className={FIELD_CLASS}
            />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-on-surface-variant">Location</h2>
        <div>
          <label htmlFor="ev-location-name" className={LABEL_CLASS}>
            VENUE NAME
          </label>
          <input
            id="ev-location-name"
            value={locationName}
            onChange={(e) => setLocationName(e.target.value)}
            className={FIELD_CLASS}
          />
        </div>
        <div>
          <label htmlFor="ev-location-address" className={LABEL_CLASS}>
            ADDRESS
          </label>
          <input
            id="ev-location-address"
            value={locationAddress}
            onChange={(e) => setLocationAddress(e.target.value)}
            className={FIELD_CLASS}
          />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-on-surface-variant">
          Capacity, RSVPs &amp; Status
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="ev-capacity" className={LABEL_CLASS}>
              CAPACITY (blank = unlimited)
            </label>
            <input
              id="ev-capacity"
              type="number"
              min={1}
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              className={FIELD_CLASS}
            />
          </div>
          <div>
            <label htmlFor="ev-status" className={LABEL_CLASS}>
              STATUS
            </label>
            <select
              id="ev-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as EventStatus)}
              className={FIELD_CLASS}
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
        <div className="flex flex-wrap gap-6">
          <label className="flex items-center gap-2 text-sm text-on-surface-variant">
            <input type="checkbox" checked={rsvpEnabled} onChange={(e) => setRsvpEnabled(e.target.checked)} />
            RSVPs open
          </label>
          <label className="flex items-center gap-2 text-sm text-on-surface-variant">
            <input type="checkbox" checked={waitlistEnabled} onChange={(e) => setWaitlistEnabled(e.target.checked)} />
            Enable waitlist when full
          </label>
        </div>
      </section>

      {mode === "edit" && eventId ? (
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-on-surface-variant">Flyer</h2>
          {flyerUrl && (
            <div className="relative h-48 w-full max-w-sm overflow-hidden rounded-lg border border-outline-variant">
              <Image src={flyerUrl} alt={flyerAlt || title} fill sizes="384px" className="object-cover" />
            </div>
          )}
          <div>
            <label htmlFor="ev-flyer-alt" className={LABEL_CLASS}>
              IMAGE ALT TEXT
            </label>
            <input
              id="ev-flyer-alt"
              value={flyerAlt}
              onChange={(e) => setFlyerAlt(e.target.value)}
              className={FIELD_CLASS}
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isFlyerPending}
              className={`rounded-sm border border-outline-variant px-3 py-2 text-sm font-medium text-on-surface-variant transition-colors hover:border-primary hover:text-primary disabled:opacity-50 ${FOCUS_RING}`}
            >
              {isFlyerPending ? "Uploading…" : flyerUrl ? "Replace image" : "Upload image"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFlyerUpload}
              className="hidden"
            />
            {flyerUrl && (
              <button
                type="button"
                onClick={handleFlyerRemove}
                disabled={isFlyerPending}
                className={`rounded-sm border border-error px-3 py-2 text-sm font-medium text-error transition-colors hover:bg-error hover:text-white disabled:opacity-50 ${FOCUS_RING}`}
              >
                Remove
              </button>
            )}
          </div>
          {flyerError && (
            <p role="alert" className="text-sm text-error">
              {flyerError}
            </p>
          )}
          <p className="text-xs text-on-surface-variant">JPEG, PNG, or WebP. Up to 5MB.</p>
        </section>
      ) : (
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-on-surface-variant">Flyer</h2>
          <p className="mt-2 text-sm text-on-surface-variant">Save the event first to upload a flyer image.</p>
        </section>
      )}

      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-on-surface-variant">
          Site-wide Pop-up Promotion
        </h2>
        <label className="flex items-center gap-2 text-sm text-on-surface-variant">
          <input type="checkbox" checked={popupEnabled} onChange={(e) => setPopupEnabled(e.target.checked)} />
          Show a pop-up promoting this event across the site
        </label>
        {popupEnabled && (
          <div className="space-y-4 border-l-2 border-outline-variant pl-4">
            <div>
              <label htmlFor="ev-popup-headline" className={LABEL_CLASS}>
                HEADLINE (defaults to event title)
              </label>
              <input
                id="ev-popup-headline"
                value={popupHeadline}
                onChange={(e) => setPopupHeadline(e.target.value)}
                className={FIELD_CLASS}
              />
            </div>
            <div>
              <label htmlFor="ev-popup-body" className={LABEL_CLASS}>
                BODY
              </label>
              <textarea
                id="ev-popup-body"
                value={popupBody}
                onChange={(e) => setPopupBody(e.target.value)}
                rows={3}
                className={FIELD_CLASS}
              />
            </div>
            <div>
              <label htmlFor="ev-popup-cta" className={LABEL_CLASS}>
                BUTTON LABEL
              </label>
              <input
                id="ev-popup-cta"
                value={popupCtaLabel}
                onChange={(e) => setPopupCtaLabel(e.target.value)}
                className={FIELD_CLASS}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="ev-popup-start" className={LABEL_CLASS}>
                  SHOW FROM (blank = immediately)
                </label>
                <input
                  id="ev-popup-start"
                  type="datetime-local"
                  value={popupStartsAt}
                  onChange={(e) => setPopupStartsAt(e.target.value)}
                  className={FIELD_CLASS}
                />
              </div>
              <div>
                <label htmlFor="ev-popup-end" className={LABEL_CLASS}>
                  SHOW UNTIL (blank = event end)
                </label>
                <input
                  id="ev-popup-end"
                  type="datetime-local"
                  value={popupEndsAt}
                  onChange={(e) => setPopupEndsAt(e.target.value)}
                  className={FIELD_CLASS}
                />
              </div>
            </div>
          </div>
        )}
      </section>

      {error && (
        <p role="alert" className="text-sm text-error">
          {error}
        </p>
      )}
      {saved && !error && <p className="text-sm text-secondary">Saved.</p>}

      <div className="flex items-center gap-3 border-t border-outline-variant pt-6">
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending || !title || !slug || !startAt || !endAt}
          className={`rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50 ${FOCUS_RING}`}
        >
          {isPending ? "Saving…" : "Save event"}
        </button>
        {mode === "edit" && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={isPending}
            className={`rounded-lg border border-error px-5 py-2.5 text-sm font-medium text-error transition-colors hover:bg-error hover:text-white disabled:opacity-50 ${FOCUS_RING}`}
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}
