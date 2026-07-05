"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createServerSupabaseClient, createServiceRoleClient } from "@/lib/supabase/server";
import { sendCampaignBatches } from "@/lib/campaignEmail";

export interface SendCampaignResult {
  sendId: string;
  sent: number;
  failed: number;
  skipped: number;
}

export async function sendCampaign(
  templateId: string,
  subject: string,
  selectedEmails: string[]
): Promise<SendCampaignResult> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/admin/login");
  }

  const trimmedSubject = subject.trim();
  if (!trimmedSubject) throw new Error("Subject is required");

  const serviceRole = createServiceRoleClient();

  const { data: template, error: templateError } = await serviceRole
    .from("email_templates")
    .select("*")
    .eq("id", templateId)
    .maybeSingle();
  if (templateError || !template) throw new Error("Template not found");

  const uniqueEmails = Array.from(new Set(selectedEmails.map((e) => e.trim().toLowerCase()))).filter(Boolean);
  if (uniqueEmails.length === 0) throw new Error("Select at least one recipient");

  const { data: unsubscribes } = await serviceRole
    .from("email_unsubscribes")
    .select("email")
    .in("email", uniqueEmails);
  const unsubscribedSet = new Set((unsubscribes ?? []).map((row) => row.email.toLowerCase()));

  const sendableEmails = uniqueEmails.filter((e) => !unsubscribedSet.has(e));
  const skippedEmails = uniqueEmails.filter((e) => unsubscribedSet.has(e));

  const { data: sendRow, error: sendError } = await serviceRole
    .from("email_sends")
    .insert({
      template_id: template.id,
      template_name: template.name,
      subject: trimmedSubject,
      sent_by: user.email,
      recipient_count: uniqueEmails.length,
    })
    .select("id")
    .single();
  if (sendError || !sendRow) throw new Error("Failed to record campaign");

  const recipientRows = [
    ...sendableEmails.map((email) => ({ send_id: sendRow.id, email, status: "pending" as const })),
    ...skippedEmails.map((email) => ({ send_id: sendRow.id, email, status: "skipped_unsubscribed" as const })),
  ];
  if (recipientRows.length > 0) {
    await serviceRole.from("email_send_recipients").insert(recipientRows);
  }

  let sentCount = 0;
  let failedCount = 0;

  if (sendableEmails.length > 0) {
    const results = await sendCampaignBatches(sendableEmails, trimmedSubject, template.html_body);
    for (const result of results) {
      await serviceRole
        .from("email_send_recipients")
        .update({
          status: result.status,
          error: result.error ?? null,
          sent_at: result.status === "sent" ? new Date().toISOString() : null,
        })
        .eq("send_id", sendRow.id)
        .eq("email", result.email);
      if (result.status === "sent") sentCount++;
      else failedCount++;
    }
  }

  revalidatePath("/admin/send");
  revalidatePath(`/admin/send/${sendRow.id}`);

  return {
    sendId: sendRow.id,
    sent: sentCount,
    failed: failedCount,
    skipped: skippedEmails.length,
  };
}
