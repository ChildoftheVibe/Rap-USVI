"use server";

import { revalidatePath } from "next/cache";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireAdminUser } from "@/lib/adminAuth";

const VALID_STATUSES = ["new", "contacted", "active", "inactive"] as const;
type VolunteerStatus = (typeof VALID_STATUSES)[number];

export async function updateVolunteerStatus(id: string, status: string) {
  await requireAdminUser();

  if (!VALID_STATUSES.includes(status as VolunteerStatus)) {
    throw new Error("Invalid status");
  }

  const serviceRole = createServiceRoleClient();
  const { error } = await serviceRole.from("volunteers").update({ status }).eq("id", id);
  if (error) {
    throw new Error("Failed to update status");
  }

  revalidatePath("/admin/volunteers");
}
