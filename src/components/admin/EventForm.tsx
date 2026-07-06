"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import {
  createEvent,
  updateEvent,
  deleteEvent,
  uploadEventBanner,
  removeEventBanner,
  uploadEventFlyerRatio,
  removeEventFlyerRatio,
  addEventMedia,
  removeEventMedia,
} from "@/app/admin/events/actions";
import { slugify, flyerRatioValues } from "@/lib/events";
import type { FlyerRatio, EventMediaRow } from "@/lib/events";
import type { EventStatus, PopupImageSource } from "@/lib/validation/event";
import { popupImageSourceValues } from "@/lib/validation/event";

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2";
const FIELD_CLASS =
  "w-full rounded-sm border border-outline-variant bg-surface px-4 py-2.5 outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary";
const LABEL_CLASS = "mb-2 block text-sm font-medium text-on-surface-variant";

const FLYER_RATIO_LABELS: Record<FlyerRatio, string> = {
  "3x5": "3:5",
  "4x5": "4:5",
  "9x16": "9:16",
};
const FLYER_RATIO_PREVIEW_CLASS: Record<FlyerRatio, string> = {
  "3x5": "aspect-[3/5]",
  "4x5": "aspect-[4/5]",
  "9x16": "aspect-[9/16]",
};
const POPUP_IMAGE_LABELS: Record<PopupImageSource, string> = {
  none: "No image",
  banner: "Banner image",
  flyer_3x5: "Flyer (3:5)",
  flyer_4x5: "Flyer (4:5)",
  flyer_9x16: "Flyer (9:16)",
};

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
  bannerAlt: string;
  bannerUrl: string | null;
  flyer3x5Url: string | null;
  flyer4x5Url: string | null;
  flyer9x16Url: string | null;
  popupEnabled: boolean;
  popupHeadline: string;
  popupBody: string;
  popupCtaLabel: string;
  popupStartsAt: string;
  popupEndsAt: string;
  popupImageSource: PopupImageSource;
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
  bannerAlt: "",
  bannerUrl: null,
  flyer3x5Url: null,
  flyer4x5Url: null,
  flyer9x16Url: null,
  popupEnabled: false,
  popupHeadline: "",
  popupBody: "",
  popupCtaLabel: "RSVP Now",
  popupStartsAt: "",
  popupEndsAt: "",
  popupImageSource: "banner",
};

interface EventFormProps {
  mode: "new" | "edit";
  eventId?: string;
  initial?: EventFormInitial;
  initialMedia?: EventMediaRow[];
}

export function EventForm({ mode, eventId, initial, initialMedia }: EventFormProps) {
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
  const [bannerAlt, setBannerAlt] = useState(values.bannerAlt);
  const [bannerUrl, setBannerUrl] = useState(values.bannerUrl);
  const [popupEnabled, setPopupEnabled] = useState(values.popupEnabled);
  const [popupHeadline, setPopupHeadline] = useState(values.popupHeadline);
  const [popupBody, setPopupBody] = useState(values.popupBody);
  const [popupCtaLabel, setPopupCtaLabel] = useState(values.popupCtaLabel);
  const [popupStartsAt, setPopupStartsAt] = useState(values.popupStartsAt);
  const [popupEndsAt, setPopupEndsAt] = useState(values.popupEndsAt);
  const [popupImageSource, setPopupImageSource] = useState<PopupImageSource>(values.popupImageSource);

  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [bannerError, setBannerError] = useState("");
  const [isPending, startTransition] = useTransition();
  const [isBannerPending, startBannerTransition] = useTransition();
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
      bannerAlt,
      popupEnabled,
      popupHeadline,
      popupBody,
      popupCtaLabel,
      popupStartsAt,
      popupEndsAt,
      popupImageSource,
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

  function handleBannerUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !eventId) return;
    setBannerError("");
    const formData = new FormData();
    formData.set("file", file);
    startBannerTransition(async () => {
      try {
        const result = await uploadEventBanner(eventId, formData);
        setBannerUrl(result.url);
      } catch (err) {
        setBannerError(err instanceof Error ? err.message : "Failed to upload image");
      }
    });
    e.target.value = "";
  }

  function handleBannerRemove() {
    if (!eventId) return;
    setBannerError("");
    startBannerTransition(async () => {
      try {
        await removeEventBanner(eventId);
        setBannerUrl(null);
      } catch (err) {
        setBannerError(err instanceof Error ? err.message : "Failed to remove image");
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
        {mode === "edit" && eventId ? (
          <div>
            <p className={LABEL_CLASS}>DESCRIPTION MEDIA (images &amp; videos)</p>
            <MediaGallery eventId={eventId} initialMedia={initialMedia ?? []} />
          </div>
        ) : (
          <p className="text-sm text-on-surface-variant">Save the event first to add images or videos.</p>
        )}
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
          <h2 className="text-sm font-semibold uppercase tracking-wide text-on-surface-variant">Banner Image</h2>
          {bannerUrl && (
            <div className="relative h-48 w-full max-w-sm overflow-hidden rounded-lg border border-outline-variant">
              <Image src={bannerUrl} alt={bannerAlt || title} fill sizes="384px" className="object-cover" />
            </div>
          )}
          <div>
            <label htmlFor="ev-banner-alt" className={LABEL_CLASS}>
              IMAGE ALT TEXT
            </label>
            <input
              id="ev-banner-alt"
              value={bannerAlt}
              onChange={(e) => setBannerAlt(e.target.value)}
              className={FIELD_CLASS}
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isBannerPending}
              className={`rounded-sm border border-outline-variant px-3 py-2 text-sm font-medium text-on-surface-variant transition-colors hover:border-primary hover:text-primary disabled:opacity-50 ${FOCUS_RING}`}
            >
              {isBannerPending ? "Uploading…" : bannerUrl ? "Replace image" : "Upload image"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleBannerUpload}
              className="hidden"
            />
            {bannerUrl && (
              <button
                type="button"
                onClick={handleBannerRemove}
                disabled={isBannerPending}
                className={`rounded-sm border border-error px-3 py-2 text-sm font-medium text-error transition-colors hover:bg-error hover:text-white disabled:opacity-50 ${FOCUS_RING}`}
              >
                Remove
              </button>
            )}
          </div>
          {bannerError && (
            <p role="alert" className="text-sm text-error">
              {bannerError}
            </p>
          )}
          <p className="text-xs text-on-surface-variant">
            JPEG, PNG, or WebP. Up to 5MB. Shown as the hero image at the top of the event page.
          </p>
        </section>
      ) : (
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-on-surface-variant">Banner Image</h2>
          <p className="mt-2 text-sm text-on-surface-variant">Save the event first to upload a banner image.</p>
        </section>
      )}

      {mode === "edit" && eventId ? (
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-on-surface-variant">Event Flyers</h2>
          <p className="text-xs text-on-surface-variant">
            Print/social-ready flyers at fixed aspect ratios. JPEG, PNG, or WebP, up to 5MB each.
          </p>
          <div className="grid gap-6 sm:grid-cols-3">
            {flyerRatioValues.map((ratio) => (
              <FlyerSlot
                key={ratio}
                eventId={eventId}
                ratio={ratio}
                initialUrl={
                  ratio === "3x5" ? values.flyer3x5Url : ratio === "4x5" ? values.flyer4x5Url : values.flyer9x16Url
                }
              />
            ))}
          </div>
        </section>
      ) : (
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-on-surface-variant">Event Flyers</h2>
          <p className="mt-2 text-sm text-on-surface-variant">Save the event first to upload flyers.</p>
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
            <div>
              <label htmlFor="ev-popup-image" className={LABEL_CLASS}>
                POP-UP IMAGE
              </label>
              <select
                id="ev-popup-image"
                value={popupImageSource}
                onChange={(e) => setPopupImageSource(e.target.value as PopupImageSource)}
                className={FIELD_CLASS}
              >
                {popupImageSourceValues.map((source) => (
                  <option key={source} value={source}>
                    {POPUP_IMAGE_LABELS[source]}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-on-surface-variant">
                Choose which uploaded image shows in the pop-up. If that image hasn&apos;t been uploaded yet, the
                pop-up shows text only.
              </p>
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

function FlyerSlot({ eventId, ratio, initialUrl }: { eventId: string; ratio: FlyerRatio; initialUrl: string | null }) {
  const [url, setUrl] = useState(initialUrl);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    const formData = new FormData();
    formData.set("file", file);
    startTransition(async () => {
      try {
        const result = await uploadEventFlyerRatio(eventId, ratio, formData);
        setUrl(result.url);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to upload image");
      }
    });
    e.target.value = "";
  }

  function handleRemove() {
    setError("");
    startTransition(async () => {
      try {
        await removeEventFlyerRatio(eventId, ratio);
        setUrl(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to remove image");
      }
    });
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-on-surface-variant">{FLYER_RATIO_LABELS[ratio]}</p>
      <div
        className={`relative w-full overflow-hidden rounded-lg border border-outline-variant bg-surface-container-lowest ${FLYER_RATIO_PREVIEW_CLASS[ratio]}`}
      >
        {url && <Image src={url} alt="" fill sizes="200px" className="object-cover" />}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isPending}
          className={`rounded-sm border border-outline-variant px-2.5 py-1.5 text-xs font-medium text-on-surface-variant transition-colors hover:border-primary hover:text-primary disabled:opacity-50 ${FOCUS_RING}`}
        >
          {isPending ? "Uploading…" : url ? "Replace" : "Upload"}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleUpload}
          className="hidden"
        />
        {url && (
          <button
            type="button"
            onClick={handleRemove}
            disabled={isPending}
            className={`rounded-sm border border-error px-2.5 py-1.5 text-xs font-medium text-error transition-colors hover:bg-error hover:text-white disabled:opacity-50 ${FOCUS_RING}`}
          >
            Remove
          </button>
        )}
      </div>
      {error && (
        <p role="alert" className="text-xs text-error">
          {error}
        </p>
      )}
    </div>
  );
}

function MediaGallery({ eventId, initialMedia }: { eventId: string; initialMedia: EventMediaRow[] }) {
  const [media, setMedia] = useState(initialMedia);
  const [altDraft, setAltDraft] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    const formData = new FormData();
    formData.set("file", file);
    formData.set("alt", altDraft);
    startTransition(async () => {
      try {
        const row = await addEventMedia(eventId, formData);
        setMedia((prev) => [...prev, row as EventMediaRow]);
        setAltDraft("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to upload file");
      }
    });
    e.target.value = "";
  }

  function handleRemove(id: string) {
    setError("");
    startTransition(async () => {
      try {
        await removeEventMedia(id, eventId);
        setMedia((prev) => prev.filter((item) => item.id !== id));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to remove upload");
      }
    });
  }

  return (
    <div className="space-y-4">
      {media.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-3">
          {media.map((item) => (
            <div key={item.id} className="space-y-2">
              <div className="relative aspect-video overflow-hidden rounded-lg border border-outline-variant bg-surface-container-lowest">
                {item.media_type === "image" ? (
                  <Image src={item.url} alt={item.alt ?? ""} fill sizes="240px" className="object-cover" />
                ) : (
                  // eslint-disable-next-line jsx-a11y/media-has-caption
                  <video src={item.url} controls className="h-full w-full object-cover" />
                )}
              </div>
              {item.media_type === "image" && (
                <p className="truncate text-xs text-on-surface-variant" title={item.alt ?? ""}>
                  {item.alt ? `Alt: ${item.alt}` : "No alt text"}
                </p>
              )}
              <button
                type="button"
                onClick={() => handleRemove(item.id)}
                disabled={isPending}
                className={`w-full rounded-sm border border-error px-3 py-1.5 text-xs font-medium text-error transition-colors hover:bg-error hover:text-white disabled:opacity-50 ${FOCUS_RING}`}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
      <div>
        <label htmlFor="ev-media-alt" className={LABEL_CLASS}>
          ALT TEXT (for the next image upload)
        </label>
        <input
          id="ev-media-alt"
          value={altDraft}
          onChange={(e) => setAltDraft(e.target.value)}
          placeholder="Describe the image for screen readers"
          className={FIELD_CLASS}
        />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isPending}
          className={`rounded-sm border border-outline-variant px-3 py-2 text-sm font-medium text-on-surface-variant transition-colors hover:border-primary hover:text-primary disabled:opacity-50 ${FOCUS_RING}`}
        >
          {isPending ? "Uploading…" : "Add image or video"}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime"
          onChange={handleUpload}
          className="hidden"
        />
      </div>
      {error && (
        <p role="alert" className="text-sm text-error">
          {error}
        </p>
      )}
      <p className="text-xs text-on-surface-variant">
        JPEG, PNG, WebP, MP4, WebM, or MOV. Up to 25MB. Shown alongside the description on the event page.
      </p>
    </div>
  );
}
