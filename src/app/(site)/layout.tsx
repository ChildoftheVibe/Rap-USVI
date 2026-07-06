import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { JoinMovementModal } from "@/components/cta/JoinMovementModal";
import { EventPopup, type PopupEventData } from "@/components/events/EventPopup";
import { createServiceRoleClient } from "@/lib/supabase/server";

export const revalidate = 60;

/**
 * The one event (if any) currently promoted via a site-wide pop-up, per the
 * admin's toggle + window. This layout wraps every page on the site
 * (including privacy/terms/accessibility), so a Supabase hiccup here must
 * never break the whole site — fail closed to "no pop-up" instead.
 */
async function getActivePopupEvent(): Promise<PopupEventData | null> {
  try {
    const supabase = createServiceRoleClient();
    const nowIso = new Date().toISOString();

    const { data } = await supabase
      .from("events")
      .select("slug, title, popup_headline, popup_body, popup_cta_label, flyer_url")
      .eq("status", "published")
      .eq("popup_enabled", true)
      .gte("end_at", nowIso)
      .or(`popup_starts_at.is.null,popup_starts_at.lte.${nowIso}`)
      .or(`popup_ends_at.is.null,popup_ends_at.gte.${nowIso}`)
      .order("start_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    return data as PopupEventData | null;
  } catch (err) {
    console.error("Failed to load active pop-up event", err);
    return null;
  }
}

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const popupEvent = await getActivePopupEvent();

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
      <EventPopup event={popupEvent} />
    </>
  );
}
