export const site = {
  name: "Restore America's Paradise",
  legalName: "Restore America's Paradise, Inc.",
  shortName: "RAP",
  tagline: "Restoring the Promise. Reclaiming the Paradise.",
  domain: "rap-usvi.org",
  url: "https://rap-usvi.org",
  description:
    "A movement dedicated to the restoration, revitalization, and preservation of the cultural, economic, and environmental vitality of the U.S. Virgin Islands through responsible governance and civic pride.",
};

export const contact = {
  phone: "(954) 539-2675",
  phoneHref: "tel:+19545392675",
  emails: ["info@rap-usvi.org", "Donate@rap-usvi.org"],
  location: "St. Croix, U.S. Virgin Islands",
  chairman: "Earl L. Philip",
  chairmanTitle: "Chairman / President",
};

export const mission = {
  eyebrow: "U.S. VIRGIN ISLANDS CIVIC MOVEMENT",
  headline: "Our Mission & Core Mandate",
  statement:
    "To promote the restoration, revitalization, and preservation of the cultural, economic, and environmental vitality of the U.S. Virgin Islands through civic engagement, public education, and advocacy for responsible governance, resilient infrastructure, and territorial empowerment.",
  context:
    "Founded to address a critical crossroads for our territory, RAP stands against political neglect and economic stagnation. We are a movement to rebuild the heart, soul, and strength of the Virgin Islands community.",
  quote:
    "We are at a crossroads. It is time to reclaim the promise of our paradise.",
  quoteAttribution: `${contact.chairman}, ${contact.chairmanTitle}`,
  featureCards: [
    {
      icon: "account_balance",
      title: "Responsible Governance",
      description:
        "Advocating for accountability and transparency at all levels of territorial leadership.",
    },
    {
      icon: "groups",
      title: "Community Pride",
      description:
        "Fostering unity and local ownership to ensure a resilient future for the next generation.",
    },
  ],
};

export type PillarId =
  | "political-empowerment"
  | "economic-revival"
  | "cultural-restoration"
  | "environmental-stewardship"
  | "civic-engagement";

export const pillars: {
  id: PillarId;
  icon: string;
  title: string;
  description: string;
  accent: "primary" | "harvest-gold" | "caribbean-azure" | "secondary" | "heritage-red";
}[] = [
  {
    id: "political-empowerment",
    icon: "gavel",
    title: "Political Empowerment",
    description:
      "Advocating for greater territorial representation and fair access to federal resources within the U.S. system.",
    accent: "primary",
  },
  {
    id: "economic-revival",
    icon: "trending_up",
    title: "Economic Revival",
    description:
      "Promoting entrepreneurship, workforce development, and public-private partnerships in key industries.",
    accent: "harvest-gold",
  },
  {
    id: "cultural-restoration",
    icon: "history_edu",
    title: "Cultural Restoration",
    description:
      "Protecting our heritage, language, and traditions for future generations to anchor their identity.",
    accent: "caribbean-azure",
  },
  {
    id: "environmental-stewardship",
    icon: "eco",
    title: "Environmental Stewardship",
    description:
      "Safeguarding natural beauty and promoting coastal preservation alongside sustainable development.",
    accent: "secondary",
  },
  {
    id: "civic-engagement",
    icon: "campaign",
    title: "Civic Engagement",
    description:
      "Mobilizing citizens through education and service to foster unity and permanent local ownership.",
    accent: "heritage-red",
  },
];

export const academy = {
  eyebrow: "Flagship Initiative",
  name: "America's Paradise Leadership Academy",
  description:
    "The territory's first public, military-style high school for grades 9-12. Designed to empower youth through academic excellence and structured discipline.",
  motto: "God · Duty · Discipline · Achievement",
  mottoLabel: "Our Founding Motto",
  targetLaunch: "2027-28",
  targetLaunchLabel: "Target Launch",
  initialCadets: "50-60",
  initialCadetsLabel: "Initial Cadets",
  tracks: [
    { icon: "security", label: "Cybersecurity" },
    { icon: "flight", label: "Aviation" },
    { icon: "local_police", label: "Public Safety" },
    { icon: "anchor", label: "Maritime Trades" },
  ],
};

export const interestAreas = [
  { value: "academy_enrollment", label: "Academy Enrollment" },
  { value: "corporate_sponsorship", label: "Corporate Sponsorship" },
  { value: "volunteer_opportunities", label: "Volunteer Opportunities" },
  { value: "donation_inquiry", label: "Donation Inquiry" },
] as const;

export type InterestArea = (typeof interestAreas)[number]["value"];
