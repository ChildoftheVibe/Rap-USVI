"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { openJoinModal } from "@/components/cta/JoinMovementModal";
import { DonateButton } from "@/components/cta/DonateButton";
import { site } from "@/lib/content";

// Section anchors are rooted ("/#pillars", not "#pillars") so they work from
// any page — Link navigates to "/" first, then scrolls to the section, the
// same fix already applied to the Footer's nav links.
const NAV_LINKS = [
  { href: "/#pillars", label: "Pillars" },
  { href: "/#academy", label: "Academy" },
  { href: "/#events", label: "Events" },
  { href: "/events", label: "All Events" },
  { href: "/#about", label: "About" },
  { href: "/#contact", label: "Contact" },
];

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  // Close the mobile menu on Escape for keyboard users.
  useEffect(() => {
    if (!menuOpen) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [menuOpen]);

  function handleJoin() {
    setMenuOpen(false);
    openJoinModal();
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-outline-variant bg-surface">
      <nav
        aria-label="Primary"
        className="mx-auto flex max-w-container-max items-center justify-between gap-4 px-margin-mobile py-3 md:px-margin-desktop"
      >
        <Link
          href="/"
          className="rounded-md font-[family-name:var(--font-headline)] text-lg font-bold tracking-tight text-primary md:text-2xl"
        >
          {site.name}
        </Link>

        {/* Desktop navigation */}
        <div className="hidden items-center gap-6 lg:flex xl:gap-8">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-md px-1 py-1 text-on-surface-variant transition-colors hover:text-primary"
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Desktop actions */}
        <div className="hidden items-center gap-3 md:flex">
          <button type="button" onClick={handleJoin} className="btn btn-sm btn-primary">
            Join Us
          </button>
          <DonateButton />
        </div>

        {/* Mobile hamburger */}
        <button
          type="button"
          className="btn btn-sm btn-outline aspect-square !min-h-[2.75rem] !min-w-[2.75rem] !px-0 md:hidden"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          onClick={() => setMenuOpen((v) => !v)}
        >
          <span className="material-symbols-outlined" aria-hidden="true">
            {menuOpen ? "close" : "menu"}
          </span>
        </button>
      </nav>

      {/* Mobile menu panel */}
      {menuOpen && (
        <div
          id="mobile-menu"
          className="border-t border-outline-variant bg-surface px-margin-mobile pb-6 pt-2 md:hidden"
        >
          <ul className="flex flex-col">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="block rounded-md py-3 text-base text-on-surface-variant transition-colors hover:text-primary"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-col gap-3">
            <button type="button" onClick={handleJoin} className="btn btn-md btn-primary w-full">
              Join Us
            </button>
            <DonateButton className="btn btn-md btn-gold w-full" />
          </div>
        </div>
      )}
    </header>
  );
}
