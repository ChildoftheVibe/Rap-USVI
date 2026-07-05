import Image from "next/image";
import { openJoinModal } from "@/components/cta/JoinMovementModal";
import { mission } from "@/lib/content";

export function Hero() {
  return (
    <section className="relative flex min-h-[85vh] items-center overflow-hidden">
      <div className="absolute inset-0 z-0">
        <Image
          src="/images/hero-coastline.jpg"
          alt="U.S. Virgin Islands coastline at sunset"
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="hero-gradient absolute inset-0" />
      </div>
      <div className="relative z-10 mx-auto grid max-w-container-max gap-12 px-margin-mobile py-16 md:grid-cols-2 md:items-center md:px-margin-desktop">
        <div className="animate-fade-in flex flex-col gap-6">
          <span className="inline-block w-max rounded-chip bg-harvest-gold px-4 py-1 text-xs font-medium text-primary">
            {mission.eyebrow}
          </span>
          <h1 className="font-[family-name:var(--font-headline)] text-4xl font-semibold leading-tight text-white md:text-6xl">
            Restoring the Promise. <br />
            <span className="italic text-harvest-gold">Reclaiming the Paradise.</span>
          </h1>
          <p className="max-w-xl text-lg text-white/90">{"A movement dedicated to the restoration, revitalization, and preservation of the cultural, economic, and environmental vitality of our islands through responsible governance and civic pride."}</p>
          <div className="flex flex-wrap gap-4 pt-4">
            <button
              type="button"
              onClick={openJoinModal}
              className="rounded-lg bg-white px-8 py-4 font-medium text-primary shadow-xl transition-all hover:bg-island-sand active:scale-95"
            >
              Join the Movement
            </button>
          </div>
        </div>
        <div className="flex justify-center md:justify-end">
          <div className="animate-pulse-slow flex h-64 w-64 items-center justify-center md:h-[350px] md:w-[350px]">
            <Image
              src="/logo/rap-logo.png"
              alt="Restore America's Paradise Seal"
              width={450}
              height={450}
              className="h-auto w-full drop-shadow-xl"
              priority
            />
          </div>
        </div>
      </div>
    </section>
  );
}
