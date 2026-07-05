import { EnrollmentButton } from "@/components/cta/EnrollmentButton";
import { academy } from "@/lib/content";

export function Academy() {
  return (
    <section className="overflow-hidden bg-primary py-24 text-white" id="academy">
      <div className="mx-auto max-w-container-max px-margin-mobile md:px-margin-desktop">
        <div className="grid items-center gap-16 lg:grid-cols-2">
          <div className="order-2 lg:order-1">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-4 pt-12">
                {academy.tracks.slice(0, 2).map((track) => (
                  <div
                    key={track.label}
                    className="rounded-lg border border-white/20 bg-white/10 p-6 transition-colors hover:bg-white/20"
                  >
                    <span className="material-symbols-outlined mb-4 block text-3xl text-harvest-gold" aria-hidden="true">
                      {track.icon}
                    </span>
                    <h5 className="font-medium uppercase">{track.label}</h5>
                  </div>
                ))}
              </div>
              <div className="space-y-4">
                {academy.tracks.slice(2, 4).map((track) => (
                  <div
                    key={track.label}
                    className="rounded-lg border border-white/20 bg-white/10 p-6 transition-colors hover:bg-white/20"
                  >
                    <span className="material-symbols-outlined mb-4 block text-3xl text-harvest-gold" aria-hidden="true">
                      {track.icon}
                    </span>
                    <h5 className="font-medium uppercase">{track.label}</h5>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="order-1 flex flex-col gap-8 lg:order-2">
            <div>
              <span className="font-medium uppercase tracking-widest text-harvest-gold">
                {academy.eyebrow}
              </span>
              <h2 className="mb-6 mt-2 font-[family-name:var(--font-headline)] text-3xl md:text-4xl">
                {academy.name}
              </h2>
              <p className="text-white/80">{academy.description}</p>
            </div>
            <div className="border-y border-white/10 py-6">
              <p className="mb-2 font-[family-name:var(--font-headline)] italic text-harvest-gold">
                {academy.motto}
              </p>
              <p className="text-sm uppercase tracking-widest opacity-75">{academy.mottoLabel}</p>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex flex-col">
                <span className="text-3xl font-bold text-harvest-gold">{academy.targetLaunch}</span>
                <span className="text-xs uppercase opacity-70">{academy.targetLaunchLabel}</span>
              </div>
              <div className="h-12 w-px bg-white/20" />
              <div className="flex flex-col">
                <span className="text-3xl font-bold text-harvest-gold">{academy.initialCadets}</span>
                <span className="text-xs uppercase opacity-70">{academy.initialCadetsLabel}</span>
              </div>
            </div>
            <EnrollmentButton />
          </div>
        </div>
      </div>
    </section>
  );
}
