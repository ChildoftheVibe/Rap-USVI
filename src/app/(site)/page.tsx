import { Hero } from "@/components/sections/Hero";
import { MissionOverview } from "@/components/sections/MissionOverview";
import { Pillars } from "@/components/sections/Pillars";
import { Academy } from "@/components/sections/Academy";
import { CommunityEvent } from "@/components/sections/CommunityEvent";
import { Contact } from "@/components/sections/Contact";

export default function Home() {
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
