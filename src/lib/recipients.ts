import { createServiceRoleClient } from "@/lib/supabase/server";
import { interestAreas } from "@/lib/content";

export type RecipientSource = "newsletter" | (typeof interestAreas)[number]["value"];

export interface Recipient {
  email: string;
  name: string | null;
  sources: RecipientSource[];
  unsubscribed: boolean;
}

export const RECIPIENT_SOURCE_LABELS: Record<RecipientSource, string> = {
  newsletter: "Newsletter",
  ...(Object.fromEntries(interestAreas.map((a) => [a.value, a.label])) as Record<
    (typeof interestAreas)[number]["value"],
    string
  >),
};

/** Combined, de-duplicated address book across newsletter sign-ups and stakeholder inquiries. */
export async function getRecipientDirectory(): Promise<Recipient[]> {
  const supabase = createServiceRoleClient();

  const [{ data: signups }, { data: inquiries }, { data: unsubscribes }] = await Promise.all([
    supabase.from("newsletter_signups").select("email"),
    supabase.from("inquiries").select("email, full_name, interest_area"),
    supabase.from("email_unsubscribes").select("email"),
  ]);

  const unsubscribedSet = new Set((unsubscribes ?? []).map((row) => row.email.toLowerCase()));
  const byEmail = new Map<string, Recipient>();

  for (const row of signups ?? []) {
    const key = row.email.toLowerCase();
    const existing = byEmail.get(key);
    if (existing) {
      if (!existing.sources.includes("newsletter")) existing.sources.push("newsletter");
    } else {
      byEmail.set(key, {
        email: row.email,
        name: null,
        sources: ["newsletter"],
        unsubscribed: unsubscribedSet.has(key),
      });
    }
  }

  for (const row of inquiries ?? []) {
    const key = row.email.toLowerCase();
    const source = row.interest_area as RecipientSource;
    const existing = byEmail.get(key);
    if (existing) {
      if (!existing.sources.includes(source)) existing.sources.push(source);
      if (!existing.name && row.full_name) existing.name = row.full_name;
    } else {
      byEmail.set(key, {
        email: row.email,
        name: row.full_name,
        sources: [source],
        unsubscribed: unsubscribedSet.has(key),
      });
    }
  }

  return Array.from(byEmail.values()).sort((a, b) => a.email.localeCompare(b.email));
}
