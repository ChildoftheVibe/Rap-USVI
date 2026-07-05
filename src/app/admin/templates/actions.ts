"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createServerSupabaseClient, createServiceRoleClient } from "@/lib/supabase/server";
import { emailTemplateSchema, type EmailTemplateInput } from "@/lib/validation/emailTemplate";

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

function parseOrThrow(input: EmailTemplateInput) {
  const parsed = emailTemplateSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid input");
  }
  return parsed.data;
}

export async function createTemplate(input: EmailTemplateInput) {
  await requireUser();
  const data = parseOrThrow(input);

  const serviceRole = createServiceRoleClient();
  const { data: row, error } = await serviceRole
    .from("email_templates")
    .insert({ name: data.name, subject: data.subject, html_body: data.htmlBody })
    .select("id")
    .single();

  if (error || !row) throw new Error("Failed to create template");

  revalidatePath("/admin/templates");
  redirect(`/admin/templates/${row.id}`);
}

export async function updateTemplate(id: string, input: EmailTemplateInput) {
  await requireUser();
  const data = parseOrThrow(input);

  const serviceRole = createServiceRoleClient();
  const { error } = await serviceRole
    .from("email_templates")
    .update({
      name: data.name,
      subject: data.subject,
      html_body: data.htmlBody,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw new Error("Failed to update template");

  revalidatePath("/admin/templates");
  revalidatePath(`/admin/templates/${id}`);
}

export async function deleteTemplate(id: string) {
  await requireUser();
  const serviceRole = createServiceRoleClient();
  const { error } = await serviceRole.from("email_templates").delete().eq("id", id);
  if (error) throw new Error("Failed to delete template");

  revalidatePath("/admin/templates");
  redirect("/admin/templates");
}
