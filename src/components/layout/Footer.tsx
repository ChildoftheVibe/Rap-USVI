import Link from "next/link";
import { site } from "@/lib/content";

export function Footer() {
  return (
    <footer className="w-full bg-primary text-white">
      <div className="mx-auto flex w-full max-w-container-max flex-col items-center gap-md px-margin-mobile py-xl md:px-margin-desktop">
        <div className="mb-4 font-[family-name:var(--font-headline)] text-xl text-white">
          {site.name}
        </div>
        <div className="mb-8 flex flex-wrap justify-center gap-8 text-white/80">
          <a href="#about" className="decoration-harvest-gold decoration-2 transition-opacity hover:text-white hover:underline">
            Mission
          </a>
          <a href="#academy" className="decoration-harvest-gold decoration-2 transition-opacity hover:text-white hover:underline">
            Leadership Academy
          </a>
          <a href="#events" className="decoration-harvest-gold decoration-2 transition-opacity hover:text-white hover:underline">
            Point Udall Event
          </a>
          <Link href="/privacy" className="decoration-harvest-gold decoration-2 transition-opacity hover:text-white hover:underline">
            Privacy Policy
          </Link>
          <Link href="/terms" className="decoration-harvest-gold decoration-2 transition-opacity hover:text-white hover:underline">
            Terms of Use
          </Link>
          <Link href="/accessibility" className="decoration-harvest-gold decoration-2 transition-opacity hover:text-white hover:underline">
            Accessibility
          </Link>
        </div>
        <p className="max-w-2xl text-center text-sm text-white/70">
          {site.legalName} is a tax-exempt 501(c)(3) organization. Donations are tax-deductible to
          the extent allowed by law.
        </p>
        <p className="mt-4 text-xs text-white/50">
          © {new Date().getFullYear()} {site.legalName}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
