import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { JoinMovementModal } from "@/components/cta/JoinMovementModal";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to content
      </a>
      <Header />
      <main id="main-content">{children}</main>
      <Footer />
      <JoinMovementModal />
    </>
  );
}
