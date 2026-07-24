"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createServerSupabaseClient, createServiceRoleClient } from "@/lib/supabase/server";
import { donationReceiptTemplateSchema, type DonationReceiptTemplateInput } from "@/lib/validation/donation";

async function requireUser() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/admin/login");
  }
  return user;
}

export async function saveReceiptTemplate(input: DonationReceiptTemplateInput) {
  await requireUser();
  const parsed = donationReceiptTemplateSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid input");
  }

  const serviceRole = createServiceRoleClient();
  const { error } = await serviceRole.from("donation_receipt_template").upsert({
    id: 1,
    subject: parsed.data.subject,
    html_body: parsed.data.htmlBody,
    updated_at: new Date().toISOString(),
  });

  if (error) throw new Error("Failed to save receipt template");

  revalidatePath("/admin/donations/receipt-template");
}

export async function resetReceiptTemplate() {
  await requireUser();
  const serviceRole = createServiceRoleClient();
  const { error } = await serviceRole.from("donation_receipt_template").delete().eq("id", 1);
  if (error) throw new Error("Failed to reset receipt template");

  revalidatePath("/admin/donations/receipt-template");
}
