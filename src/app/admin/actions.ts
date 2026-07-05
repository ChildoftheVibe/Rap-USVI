"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createServerSupabaseClient, createServiceRoleClient } from "@/lib/supabase/server";

const VALID_STATUSES = ["new", "reviewed", "archived"] as const;
type InquiryStatus = (typeof VALID_STATUSES)[number];

export async function signOut() {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}

export async function updateInquiryStatus(id: string, status: string) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/admin/login");
  }

  if (!VALID_STATUSES.includes(status as InquiryStatus)) {
    throw new Error("Invalid status");
  }

  const serviceRole = createServiceRoleClient();
  const { error } = await serviceRole.from("inquiries").update({ status }).eq("id", id);
  if (error) {
    throw new Error("Failed to update status");
  }

  revalidatePath("/admin/inquiries");
}
