import { PlaceholderImage } from "@/components/ui/PlaceholderImage";
import { AddToCalendarButton } from "@/components/cta/AddToCalendarButton";
import { event } from "@/lib/content";

export function CommunityEvent() {
  return (
    <section className="bg-island-sand py-24" id="events">
      <div className="mx-auto max-w-container-max px-margin-mobile md:px-margin-desktop">
        <div className="flex flex-col overflow-hidden rounded-3xl bg-white shadow-2xl lg:flex-row">
          <div className="relative h-96 lg:h-auto lg:w-1/2">
            <PlaceholderImage label="Point Udall, St. Croix" variant="sand" className="h-full w-full" />
            <div className="absolute left-8 top-8 min-w-[100px] rounded-lg bg-harvest-gold p-4 text-center text-primary shadow-lg">
              <span className="block text-2xl font-bold">{event.dateLabel}</span>
              <span className="text-sm font-bold">{event.yearLabel}</span>
            </div>
          </div>
          <div className="flex flex-col justify-center p-12 lg:w-1/2 lg:p-20">
            <h2 className="mb-4 font-[family-name:var(--font-headline)] text-3xl text-primary md:text-4xl">
              {event.name}
            </h2>
            <div className="mb-8 flex items-center gap-3 text-caribbean-azure">
              <span className="material-symbols-outlined">location_on</span>
              <span className="font-medium">
                {event.location} | {event.time}
              </span>
            </div>
            <p className="mb-8 leading-relaxed text-on-surface-variant">{event.description}</p>
            <div className="mb-8 flex items-center gap-4 rounded-lg border border-outline-variant bg-surface p-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-chip bg-primary text-white">
                <span className="material-symbols-outlined">person</span>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-on-surface-variant">
                  Featured Guest Speaker
                </p>
                <p className="text-lg font-bold text-primary">{event.speaker.name}</p>
                <p className="text-sm italic opacity-75">{event.speaker.title}</p>
              </div>
            </div>
            <AddToCalendarButton />
          </div>
        </div>
      </div>
    </section>
  );
}
