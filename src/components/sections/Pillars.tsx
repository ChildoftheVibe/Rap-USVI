import { pillars } from "@/lib/content";

const ACCENT_BORDER: Record<string, string> = {
  primary: "border-primary",
  "harvest-gold": "border-harvest-gold",
  "caribbean-azure": "border-caribbean-azure",
  secondary: "border-secondary",
  "heritage-red": "border-heritage-red",
};

const ACCENT_TEXT: Record<string, string> = {
  primary: "text-primary",
  "harvest-gold": "text-harvest-gold",
  "caribbean-azure": "text-caribbean-azure",
  secondary: "text-secondary",
  "heritage-red": "text-heritage-red",
};

export function Pillars() {
  return (
    <section className="bg-surface py-24" id="pillars">
      <div className="mx-auto max-w-container-max px-margin-mobile md:px-margin-desktop">
        <div className="mb-16 text-center">
          <h2 className="font-[family-name:var(--font-headline)] text-3xl text-primary md:text-4xl">
            The Five Strategic Pillars
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-on-surface-variant">
            Our core framework for moving the U.S. Virgin Islands toward self-reliance and
            revitalization.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-3 lg:grid-cols-5">
          {pillars.map((pillar) => (
            <div
              key={pillar.id}
              className={`group rounded-lg border-t-4 bg-white p-8 shadow-sm transition-all duration-300 hover:shadow-xl ${ACCENT_BORDER[pillar.accent]}`}
            >
              <span
                aria-hidden="true"
                className={`material-symbols-outlined mb-6 block text-4xl transition-transform group-hover:scale-110 ${ACCENT_TEXT[pillar.accent]}`}
              >
                {pillar.icon}
              </span>
              <h3 className="mb-4 font-[family-name:var(--font-headline)] text-xl text-primary">
                {pillar.title}
              </h3>
              <p className="text-sm text-on-surface-variant">{pillar.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
