import { Hero } from "@/components/sections/Hero";
import { MissionOverview } from "@/components/sections/MissionOverview";
import { Pillars } from "@/components/sections/Pillars";
import { Academy } from "@/components/sections/Academy";
import { CommunityEvent } from "@/components/sections/CommunityEvent";
import { Contact } from "@/components/sections/Contact";

// The Community Calendar section reads live events, so this page must never
// be statically cached — same reasoning as /events.
export const dynamic = "force-dynamic";

export default async function Home() {
  return (
    <>
      <Hero />
      <MissionOverview />
      <Pillars />
      <Academy />
      <CommunityEvent />
      <Contact />
    </>
  );
}
