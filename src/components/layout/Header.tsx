"use client";

import { openJoinModal } from "@/components/cta/JoinMovementModal";
import { DonateButton } from "@/components/cta/DonateButton";
import { site } from "@/lib/content";

const NAV_LINKS = [
  { href: "#pillars", label: "Pillars" },
  { href: "#academy", label: "Academy" },
  { href: "#events", label: "Events" },
  { href: "#about", label: "About" },
  { href: "#contact", label: "Contact" },
];

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-outline-variant bg-surface">
      <nav className="mx-auto flex max-w-container-max items-center justify-between px-margin-mobile py-md md:px-margin-desktop">
        <a href="#" className="font-[family-name:var(--font-headline)] text-xl font-bold tracking-tight text-primary md:text-2xl">
          {site.name}
        </a>
        <div className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-on-surface-variant transition-colors hover:text-primary"
            >
              {link.label}
            </a>
          ))}
        </div>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={openJoinModal}
            className="rounded-lg bg-primary px-6 py-2 font-medium text-white transition-all active:scale-95"
          >
            Join Us
          </button>
          <DonateButton />
        </div>
      </nav>
    </header>
  );
}
