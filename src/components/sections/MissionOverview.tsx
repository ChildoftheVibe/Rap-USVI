import Image from "next/image";
import { mission, contact } from "@/lib/content";

export function MissionOverview() {
  return (
    <section className="relative overflow-hidden bg-surface-container-lowest py-24" id="about">
      <div className="mx-auto max-w-container-max px-margin-mobile md:px-margin-desktop">
        <div className="grid items-center gap-12 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <h2 className="mb-8 font-[family-name:var(--font-headline)] text-3xl text-primary md:text-4xl">
              {mission.headline}
            </h2>
            <div className="space-y-6 text-on-surface-variant">
              <p className="text-lg leading-relaxed">{mission.statement}</p>
              <p>{mission.context}</p>
            </div>
            <div className="mt-12 grid gap-6 md:grid-cols-2">
              {mission.featureCards.map((card) => (
                <div key={card.title} className="rounded-lg border border-outline-variant bg-island-sand p-6">
                  <span className="material-symbols-outlined mb-4 block text-3xl text-primary">
                    {card.icon}
                  </span>
                  <h4 className="mb-2 font-medium uppercase text-primary">{card.title}</h4>
                  <p className="text-sm">{card.description}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="lg:col-span-5">
            <div className="relative h-[500px] overflow-hidden rounded-2xl border-8 border-white shadow-2xl">
              <Image
                src="/images/leadership-portrait.jpg"
                alt={`${contact.chairman}, ${contact.chairmanTitle} of Restore America's Paradise`}
                fill
                sizes="(min-width: 1024px) 40vw, 100vw"
                className="object-cover"
              />
              <div className="glass-panel absolute bottom-0 left-0 right-0 border-t border-outline-variant p-8">
                <blockquote className="font-[family-name:var(--font-headline)] italic text-primary">
                  &ldquo;{mission.quote}&rdquo;
                </blockquote>
                <cite className="mt-4 block font-medium not-italic text-on-surface-variant">
                  — {mission.quoteAttribution}
                </cite>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
