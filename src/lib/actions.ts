"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { baseChecklist } from "./onboarding";
import {
  OPERATIONAL_PROFILE_COOKIE,
  fallbackOperationalProfile,
  getOperationalProfile,
  isOperationalProfileKey,
} from "./operational-profiles";
import { getSupabase } from "./supabase";
import type {
  ClientStatus,
  ClientType,
  ContentStatus,
  QuickTodoItemType,
  QuickTodoView,
  ServiceType,
  SetupChecklistItem,
  TaskPriority,
  TaskStatus,
  TaskType,
} from "./types";

type CreateClientResult =
  | { ok: true; clientId: string }
  | { ok: false; message: string; clientId?: string };

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function requiredText(formData: FormData, key: string) {
  const value = text(formData, key);
  if (!value) {
    throw new Error(`Campo obrigatório em falta: ${key}`);
  }
  return value;
}

function platforms(formData: FormData) {
  const otherName = text(formData, "platform_other_name");
  const selected = formData
    .getAll("platforms")
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .map((item) => (item.trim() === "Outro" && otherName ? otherName : item.trim()));
  const typed =
    text(formData, "platforms")
      ?.split(",")
      .map((item) => item.trim())
      .filter(Boolean) ?? [];

  return Array.from(new Set([...selected, ...typed]));
}

function serviceTypesValue(formData: FormData) {
  const selected = formData
    .getAll("service_types")
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .map((item) => item.trim());
  const fallback = text(formData, "service_type");

  return Array.from(new Set([...selected, ...(fallback ? [fallback] : [])]));
}

function setupChecklistValue(formData: FormData): SetupChecklistItem[] {
  const completed = new Set(
    formData
      .getAll("setup_checklist")
      .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
      .map((value) => value.trim()),
  );

  return baseChecklist.map((label) => ({ label, done: completed.has(label) }));
}

function sanitizeChecklist(items: SetupChecklistItem[]) {
  return items
    .map((item) => ({
      label: typeof item.label === "string" ? item.label.trim() : "",
      done: Boolean(item.done),
    }))
    .filter((item) => item.label.length > 0);
}

function checked(formData: FormData, key: string) {
  return formData.get(key) === "on";
}

function initialTaskPriority(title: string): TaskPriority {
  if (
    [
      "Setup operacional do cliente",
      "Recolher materiais da marca",
      "Validar processo de aprovação",
    ].includes(title)
  ) {
    return "urgent";
  }

  if (title === "Criar primeira tarefa de reporting") return "low";

  return "normal";
}

function numberValue(formData: FormData, key: string) {
  const value = text(formData, key);
  if (!value) return null;
  const normalized = Number(value.replace(",", "."));
  return Number.isFinite(normalized) ? normalized : null;
}

async function getNextClientDisplayOrder(supabase: NonNullable<ReturnType<typeof getSupabase>>) {
  const { data, error } = await supabase
    .from("clients")
    .select("display_order")
    .not("display_order", "is", null)
    .order("display_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Erro ao calcular ordem do cliente", { code: error.code });
    return null;
  }

  return typeof data?.display_order === "number" ? data.display_order + 1 : 1;
}

function refreshAll() {
  revalidatePath("/");
  revalidatePath("/clients");
  revalidatePath("/content");
  revalidatePath("/tasks");
  revalidatePath("/archive");
  revalidatePath("/team");
}

function demoRedirect(path: string): never {
  redirect(`${path}${path.includes("?") ? "&" : "?"}demo=1`);
}

function supabaseOrRedirect(path: string) {
  const supabase = getSupabase();
  if (!supabase) demoRedirect(path);
  return supabase;
}

function supabaseOrError() {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error("Modo demo: configure o Supabase para gravar alterações.");
  }
  return supabase;
}

async function requireGuilhermeOperationalProfile() {
  const cookieStore = await cookies();
  const profile = getOperationalProfile(cookieStore.get(OPERATIONAL_PROFILE_COOKIE)?.value);

  if (profile?.key !== "guilherme") {
    redirect("/team");
  }
}

export async function createClientAction(formData: FormData): Promise<CreateClientResult> {
  const supabase = getSupabase();

  if (!supabase) {
    return {
      ok: false,
      message: "Supabase não está configurado. Não foi possível criar o cliente.",
    };
  }

  try {
    const payload = {
      name: requiredText(formData, "name"),
      client_code: text(formData, "client_code"),
      short_name: text(formData, "short_name"),
      display_order: await getNextClientDisplayOrder(supabase),
      logo_url: text(formData, "logo_url"),
      type: requiredText(formData, "type") as ClientType,
      status: requiredText(formData, "status") as ClientStatus,
      owner_name: text(formData, "owner_name"),
      service_type: (serviceTypesValue(formData)[0] ?? null) as ServiceType | null,
      service_types: serviceTypesValue(formData),
      monthly_value: numberValue(formData, "monthly_value"),
      contract_value: text(formData, "contract_value"),
      start_date: text(formData, "start_date"),
      contract_duration: text(formData, "contract_duration"),
      platforms: platforms(formData),
      website_url: text(formData, "website_url"),
      instagram_url: text(formData, "instagram_url"),
      facebook_url: text(formData, "facebook_url"),
      linkedin_url: text(formData, "linkedin_url"),
      tiktok_url: text(formData, "tiktok_url"),
      youtube_url: text(formData, "youtube_url"),
      metricool_url: text(formData, "metricool_url"),
      crm_newsletter_url: text(formData, "crm_newsletter_url"),
      platform_other_url: text(formData, "platform_other_url"),
      drive_url: text(formData, "drive_url"),
      figma_url: text(formData, "figma_url"),
      meta_url: text(formData, "meta_url"),
      google_drive_url: text(formData, "google_drive_url"),
      onedrive_url: text(formData, "onedrive_url"),
      figma_project_url: text(formData, "figma_project_url"),
      content_calendar_url: text(formData, "content_calendar_url"),
      final_deliverables_url: text(formData, "final_deliverables_url"),
      proposal_url: text(formData, "proposal_url"),
      contract_url: text(formData, "contract_url"),
      adjudication_url: text(formData, "adjudication_url"),
      budget_url: text(formData, "budget_url"),
      other_documents_url: text(formData, "other_documents_url"),
      brand_assets_url: text(formData, "brand_assets_url"),
      setup_checklist: setupChecklistValue(formData),
      reporting_url: text(formData, "reporting_url"),
      initial_briefing_url: text(formData, "initial_briefing_url"),
      conditions_url: text(formData, "conditions_url"),
      linkedin_campaign_manager_url: text(formData, "linkedin_campaign_manager_url"),
      notes: text(formData, "notes"),
    };
    const { data, error } = await supabase
      .from("clients")
      .insert(payload)
      .select("id, service_type, owner_name")
      .single();

    if (error) {
      console.error("Erro ao criar cliente", { code: error.code });
      return { ok: false, message: error.message };
    }

    if (checked(formData, "generate_initial_tasks") && data?.id) {
      const taskTitles = formData
        .getAll("setup_tasks")
        .filter((value): value is string => typeof value === "string" && value.trim().length > 0);

      if (taskTitles.length) {
        const { error: taskError } = await supabase.from("tasks").insert(
          taskTitles.map((title) => ({
            client_id: data.id,
            title,
            type: "operations" as TaskType,
            status: "todo" as TaskStatus,
            priority: initialTaskPriority(title),
            assignee_name: data.owner_name,
            due_date: null,
            related_url:
              payload.google_drive_url ??
              payload.onedrive_url ??
              payload.figma_project_url ??
              null,
            is_blocked: false,
            blocker_reason: null,
            notes: "Gerada no fluxo Novo Cliente.",
          })),
        );

        if (taskError) {
          console.error("Erro ao criar tarefas iniciais", {
            clientId: data.id,
            code: taskError.code,
          });
          refreshAll();
          return {
            ok: false,
            clientId: data.id,
            message: "Cliente criado, mas houve erro ao criar tarefas iniciais.",
          };
        }
      }
    }

    refreshAll();
    return { ok: true, clientId: data.id };
  } catch (error) {
    console.error("Erro inesperado ao criar cliente", {
      message: error instanceof Error ? error.message : "Erro desconhecido",
    });
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Não foi possível criar o cliente.",
    };
  }
}

export async function updateClientAction(id: string, formData: FormData) {
  const supabase = supabaseOrRedirect(`/clients/${id}`);
  const { error } = await supabase
    .from("clients")
    .update({
      name: requiredText(formData, "name"),
      client_code: text(formData, "client_code"),
      short_name: text(formData, "short_name"),
      display_order: numberValue(formData, "display_order"),
      logo_url: text(formData, "logo_url"),
      type: requiredText(formData, "type") as ClientType,
      status: requiredText(formData, "status") as ClientStatus,
      owner_name: text(formData, "owner_name"),
      service_type: (serviceTypesValue(formData)[0] ?? null) as ServiceType | null,
      service_types: serviceTypesValue(formData),
      monthly_value: numberValue(formData, "monthly_value"),
      contract_value: text(formData, "contract_value"),
      start_date: text(formData, "start_date"),
      contract_duration: text(formData, "contract_duration"),
      platforms: platforms(formData),
      website_url: text(formData, "website_url"),
      instagram_url: text(formData, "instagram_url"),
      facebook_url: text(formData, "facebook_url"),
      linkedin_url: text(formData, "linkedin_url"),
      tiktok_url: text(formData, "tiktok_url"),
      youtube_url: text(formData, "youtube_url"),
      metricool_url: text(formData, "metricool_url"),
      crm_newsletter_url: text(formData, "crm_newsletter_url"),
      platform_other_url: text(formData, "platform_other_url"),
      drive_url: text(formData, "drive_url"),
      figma_url: text(formData, "figma_url"),
      meta_url: text(formData, "meta_url"),
      google_drive_url: text(formData, "google_drive_url"),
      onedrive_url: text(formData, "onedrive_url"),
      figma_project_url: text(formData, "figma_project_url"),
      content_calendar_url: text(formData, "content_calendar_url"),
      final_deliverables_url: text(formData, "final_deliverables_url"),
      proposal_url: text(formData, "proposal_url"),
      contract_url: text(formData, "contract_url"),
      adjudication_url: text(formData, "adjudication_url"),
      budget_url: text(formData, "budget_url"),
      other_documents_url: text(formData, "other_documents_url"),
      brand_assets_url: text(formData, "brand_assets_url"),
      reporting_url: text(formData, "reporting_url"),
      initial_briefing_url: text(formData, "initial_briefing_url"),
      conditions_url: text(formData, "conditions_url"),
      linkedin_campaign_manager_url: text(formData, "linkedin_campaign_manager_url"),
      notes: text(formData, "notes"),
    })
    .eq("id", id);

  if (error) throw new Error(error.message);
  refreshAll();
  revalidatePath(`/clients/${id}`);
  redirect(`/clients/${id}`);
}

export async function updateClientSetupChecklistAction(
  id: string,
  checklist: SetupChecklistItem[],
) {
  const supabase = supabaseOrError();
  const payload = sanitizeChecklist(checklist);
  const { error } = await supabase
    .from("clients")
    .update({ setup_checklist: payload })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath(`/clients/${id}`);
  revalidatePath("/clients");
  return payload;
}

export async function createDefaultClientChecklistAction(id: string) {
  return updateClientSetupChecklistAction(
    id,
    baseChecklist.map((label) => ({ label, done: false })),
  );
}

export async function updateClientLinksAction(id: string, formData: FormData) {
  const supabase = supabaseOrError();
  const payload = {
    google_drive_url: text(formData, "google_drive_url"),
    onedrive_url: text(formData, "onedrive_url"),
    figma_project_url: text(formData, "figma_project_url"),
    final_deliverables_url: text(formData, "final_deliverables_url"),
    content_calendar_url: text(formData, "content_calendar_url"),
    reporting_url: text(formData, "reporting_url"),
    proposal_url: text(formData, "proposal_url"),
    contract_url: text(formData, "contract_url"),
    adjudication_url: text(formData, "adjudication_url"),
    brand_assets_url: text(formData, "brand_assets_url"),
    initial_briefing_url: text(formData, "initial_briefing_url"),
    conditions_url: text(formData, "conditions_url"),
    website_url: text(formData, "website_url"),
    instagram_url: text(formData, "instagram_url"),
    facebook_url: text(formData, "facebook_url"),
    linkedin_url: text(formData, "linkedin_url"),
    tiktok_url: text(formData, "tiktok_url"),
    youtube_url: text(formData, "youtube_url"),
    meta_url: text(formData, "meta_url"),
    linkedin_campaign_manager_url: text(formData, "linkedin_campaign_manager_url"),
    crm_newsletter_url: text(formData, "crm_newsletter_url"),
  };
  const { error } = await supabase.from("clients").update(payload).eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath(`/clients/${id}`);
  revalidatePath("/clients");
  return payload;
}

export async function deleteClientAction(id: string) {
  const supabase = supabaseOrRedirect("/clients");
  const { error } = await supabase.from("clients").delete().eq("id", id);

  if (error) throw new Error(error.message);
  refreshAll();
  redirect("/clients");
}

function contentPayload(formData: FormData) {
  return {
    client_id: requiredText(formData, "client_id"),
    month: requiredText(formData, "month"),
    publish_date: text(formData, "publish_date"),
    design_due_date: text(formData, "design_due_date"),
    copy_due_date: text(formData, "copy_due_date"),
    approval_due_date: text(formData, "approval_due_date"),
    publishing_due_date: text(formData, "publishing_due_date"),
    design_status: text(formData, "design_status"),
    copy_status: text(formData, "copy_status"),
    approval_status: text(formData, "approval_status"),
    publishing_status: text(formData, "publishing_status"),
    needs_design: formData.has("needs_design") ? checked(formData, "needs_design") : true,
    needs_copy: formData.has("needs_copy") ? checked(formData, "needs_copy") : true,
    needs_client_approval: checked(formData, "needs_client_approval"),
    platform: requiredText(formData, "platform"),
    format: text(formData, "format"),
    title: requiredText(formData, "title"),
    creative_brief: text(formData, "creative_brief"),
    copy_text: text(formData, "copy_text"),
    status: requiredText(formData, "status") as ContentStatus,
    assignee_name: text(formData, "assignee_name"),
    media_url: text(formData, "media_url"),
    brief_url: text(formData, "brief_url"),
    media_folder_url: text(formData, "media_folder_url"),
    figma_url: text(formData, "figma_url"),
    export_url: text(formData, "export_url"),
    delivery_url: text(formData, "delivery_url"),
    inspiration_url: text(formData, "inspiration_url"),
    published_url: text(formData, "published_url"),
    internal_review_notes: text(formData, "internal_review_notes"),
    client_feedback: text(formData, "client_feedback"),
    is_blocked: checked(formData, "is_blocked"),
    blocker_reason: text(formData, "blocker_reason"),
    recording_date: text(formData, "recording_date"),
    notes: text(formData, "notes"),
  };
}

export async function createContentAction(formData: FormData) {
  const supabase = supabaseOrRedirect("/content");
  const { error } = await supabase.from("content_items").insert(contentPayload(formData));

  if (error) throw new Error(error.message);
  refreshAll();
  redirect("/content");
}

async function updateContent(id: string, formData: FormData) {
  const supabase = supabaseOrError();
  const { error } = await supabase
    .from("content_items")
    .update(contentPayload(formData))
    .eq("id", id);

  if (error) throw new Error(error.message);
  refreshAll();
}

export async function updateContentInlineAction(id: string, formData: FormData) {
  await updateContent(id, formData);
}

export async function updateContentAction(id: string, formData: FormData) {
  const supabase = supabaseOrRedirect("/content");
  const { error } = await supabase
    .from("content_items")
    .update(contentPayload(formData))
    .eq("id", id);

  if (error) throw new Error(error.message);
  refreshAll();
  redirect("/content");
}

export async function updateContentStatusAction(id: string, formData: FormData) {
  const supabase = supabaseOrError();
  const { error } = await supabase
    .from("content_items")
    .update({ status: requiredText(formData, "status") as ContentStatus })
    .eq("id", id);

  if (error) throw new Error(error.message);
}

async function deleteContent(id: string) {
  const supabase = supabaseOrError();
  const { error } = await supabase.from("content_items").delete().eq("id", id);

  if (error) throw new Error(error.message);
  refreshAll();
}

export async function deleteContentInlineAction(id: string) {
  await deleteContent(id);
}

export async function deleteContentAction(id: string) {
  const supabase = supabaseOrRedirect("/content");
  const { error } = await supabase.from("content_items").delete().eq("id", id);

  if (error) throw new Error(error.message);
  refreshAll();
  redirect("/content");
}

function taskPayload(formData: FormData) {
  return {
    client_id: text(formData, "client_id"),
    title: requiredText(formData, "title"),
    type: (text(formData, "type") ?? "operations") as TaskType,
    status: requiredText(formData, "status") as TaskStatus,
    priority: requiredText(formData, "priority") as TaskPriority,
    assignee_name: text(formData, "assignee_name"),
    due_date: text(formData, "due_date"),
    related_url: text(formData, "related_url"),
    is_blocked: checked(formData, "is_blocked"),
    blocker_reason: text(formData, "blocker_reason"),
    notes: text(formData, "notes"),
  };
}

export async function createTaskAction(formData: FormData) {
  const supabase = supabaseOrRedirect("/tasks");
  const { error } = await supabase.from("tasks").insert(taskPayload(formData));

  if (error) throw new Error(error.message);
  refreshAll();
  redirect("/tasks");
}

async function updateTask(id: string, formData: FormData) {
  const supabase = supabaseOrError();
  const { error } = await supabase.from("tasks").update(taskPayload(formData)).eq("id", id);

  if (error) throw new Error(error.message);
  refreshAll();
}

export async function updateTaskInlineAction(id: string, formData: FormData) {
  await updateTask(id, formData);
}

export async function updateTaskStatusInlineAction(id: string, formData: FormData) {
  const supabase = supabaseOrError();
  const { error } = await supabase
    .from("tasks")
    .update({ status: requiredText(formData, "status") as TaskStatus })
    .eq("id", id);

  if (error) throw new Error(error.message);
  refreshAll();
}

export async function archiveTaskInlineAction(id: string) {
  const supabase = supabaseOrError();
  const { error } = await supabase.from("tasks").update({ status: "archived" }).eq("id", id);

  if (error) throw new Error(error.message);
  refreshAll();
}

export async function updateTaskAction(id: string, formData: FormData) {
  const supabase = supabaseOrRedirect("/tasks");
  const { error } = await supabase.from("tasks").update(taskPayload(formData)).eq("id", id);

  if (error) throw new Error(error.message);
  refreshAll();
  redirect("/tasks");
}

async function deleteTask(id: string) {
  const supabase = supabaseOrError();
  const { error } = await supabase.from("tasks").delete().eq("id", id);

  if (error) throw new Error(error.message);
  refreshAll();
}

export async function deleteTaskInlineAction(id: string) {
  await deleteTask(id);
}

export async function deleteTaskAction(id: string) {
  const supabase = supabaseOrRedirect("/tasks");
  const { error } = await supabase.from("tasks").delete().eq("id", id);

  if (error) throw new Error(error.message);
  refreshAll();
  redirect("/tasks");
}

function quickTodoViewValue(formData: FormData): QuickTodoView {
  const value = text(formData, "view");
  return value === "design" ? "design" : "marketing";
}

function quickProfileKeyValue(formData: FormData) {
  const value = text(formData, "profile_key");
  return isOperationalProfileKey(value) ? value : fallbackOperationalProfile().key;
}

function quickTodoItemTypeValue(formData: FormData): QuickTodoItemType {
  return text(formData, "item_type") === "reminder" ? "reminder" : "todo";
}

export async function createQuickTodoAction(formData: FormData) {
  const view = quickTodoViewValue(formData);
  const profileKey = quickProfileKeyValue(formData);
  const itemType = quickTodoItemTypeValue(formData);
  const supabase = supabaseOrRedirect(`/?view=${view}`);
  const { error } = await supabase.from("quick_todos").insert({
    view,
    profile_key: profileKey,
    text: requiredText(formData, "text"),
    item_type: itemType,
    done: false,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/");
  redirect(`/?view=${view}`);
}

export async function toggleQuickTodoAction(id: string, formData: FormData) {
  const view = quickTodoViewValue(formData);
  const profileKey = quickProfileKeyValue(formData);
  const supabase = supabaseOrRedirect(`/?view=${view}`);
  const { error } = await supabase
    .from("quick_todos")
    .update({ done: checked(formData, "done") })
    .eq("id", id)
    .eq("profile_key", profileKey);

  if (error) throw new Error(error.message);
  revalidatePath("/");
  redirect(`/?view=${view}`);
}

export async function updateQuickTodoAction(id: string, formData: FormData) {
  const view = quickTodoViewValue(formData);
  const profileKey = quickProfileKeyValue(formData);
  const supabase = supabaseOrRedirect(`/?view=${view}`);
  const { error } = await supabase
    .from("quick_todos")
    .update({ text: requiredText(formData, "text") })
    .eq("id", id)
    .eq("profile_key", profileKey);

  if (error) throw new Error(error.message);
  revalidatePath("/");
  redirect(`/?view=${view}`);
}

export async function deleteQuickTodoAction(id: string, formData: FormData) {
  const view = quickTodoViewValue(formData);
  const profileKey = quickProfileKeyValue(formData);
  const supabase = supabaseOrRedirect(`/?view=${view}`);
  const { error } = await supabase
    .from("quick_todos")
    .delete()
    .eq("id", id)
    .eq("profile_key", profileKey);

  if (error) throw new Error(error.message);
  revalidatePath("/");
  redirect(`/?view=${view}`);
}

export async function createQuickNoteAction(formData: FormData) {
  const view = quickTodoViewValue(formData);
  const profileKey = quickProfileKeyValue(formData);
  const supabase = supabaseOrRedirect(`/?view=${view}`);
  const { error } = await supabase.from("quick_notes").insert({
    view,
    profile_key: profileKey,
    text: requiredText(formData, "text"),
  });

  if (error) throw new Error(error.message);
  revalidatePath("/");
  redirect(`/?view=${view}`);
}

export async function updateQuickNoteAction(id: string, formData: FormData) {
  const view = quickTodoViewValue(formData);
  const profileKey = quickProfileKeyValue(formData);
  const supabase = supabaseOrRedirect(`/?view=${view}`);
  const { error } = await supabase
    .from("quick_notes")
    .update({ text: requiredText(formData, "text") })
    .eq("id", id)
    .eq("profile_key", profileKey);

  if (error) throw new Error(error.message);
  revalidatePath("/");
  redirect(`/?view=${view}`);
}

export async function deleteQuickNoteAction(id: string, formData: FormData) {
  const view = quickTodoViewValue(formData);
  const profileKey = quickProfileKeyValue(formData);
  const supabase = supabaseOrRedirect(`/?view=${view}`);
  const { error } = await supabase
    .from("quick_notes")
    .delete()
    .eq("id", id)
    .eq("profile_key", profileKey);

  if (error) throw new Error(error.message);
  revalidatePath("/");
  redirect(`/?view=${view}`);
}

function teamMemberPayload(formData: FormData) {
  return {
    name: requiredText(formData, "name"),
    role: text(formData, "role"),
    email: text(formData, "email"),
    phone: text(formData, "phone"),
    active: true,
  };
}

export async function createTeamMemberAction(formData: FormData) {
  await requireGuilhermeOperationalProfile();
  const supabase = supabaseOrRedirect("/team");
  const { error } = await supabase.from("team_members").insert(teamMemberPayload(formData));

  if (error) throw new Error(error.message);
  revalidatePath("/team");
  redirect("/team");
}

function companyContactPayload(formData: FormData) {
  return {
    label: requiredText(formData, "label"),
    email: requiredText(formData, "email"),
    phone: text(formData, "phone"),
  };
}

export async function createCompanyContactAction(formData: FormData) {
  await requireGuilhermeOperationalProfile();
  const supabase = supabaseOrRedirect("/team");
  const { error } = await supabase.from("company_contacts").insert(companyContactPayload(formData));

  if (error) throw new Error(error.message);
  revalidatePath("/team");
  redirect("/team");
}

export async function updateCompanyContactAction(id: string, formData: FormData) {
  await requireGuilhermeOperationalProfile();
  const supabase = supabaseOrRedirect("/team");
  const { error } = await supabase
    .from("company_contacts")
    .update(companyContactPayload(formData))
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/team");
  redirect("/team");
}

export async function deleteCompanyContactAction(id: string, formData?: FormData) {
  void formData;
  await requireGuilhermeOperationalProfile();
  const supabase = supabaseOrRedirect("/team");
  const { error } = await supabase.from("company_contacts").delete().eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/team");
  redirect("/team");
}

export async function updateTeamMemberAction(id: string, formData: FormData) {
  await requireGuilhermeOperationalProfile();
  const supabase = supabaseOrRedirect("/team");
  const { error } = await supabase
    .from("team_members")
    .update(teamMemberPayload(formData))
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/team");
  redirect("/team");
}
