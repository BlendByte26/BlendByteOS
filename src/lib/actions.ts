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
import { clientColorKeys } from "./types";
import type {
  ClientColorKey,
  ClientStatus,
  ClientType,
  ContentComment,
  ContentItem,
  ContentStatus,
  QuickNote,
  QuickTodo,
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

type QuickTodoActionResult =
  | { ok: true; todo?: QuickTodo }
  | { ok: false; message: string };

type QuickNoteActionResult =
  | { ok: true; note?: QuickNote }
  | { ok: false; message: string };

type BulkCreateContentResult =
  | { ok: true; createdCount: number }
  | { ok: false; message: string };

type ContentCommentsResult =
  | { ok: true; comments: ContentComment[] }
  | { ok: false; message: string };

type ContentCommentMutationResult =
  | { ok: true; comment?: ContentComment }
  | { ok: false; message: string };

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function textList(formData: FormData, key: string) {
  const values = formData
    .getAll(key)
    .filter((value): value is string => typeof value === "string")
    .flatMap((value) => value.split(","))
    .map((value) => value.trim())
    .filter(Boolean);

  const uniqueValues = Array.from(new Set(values));
  return uniqueValues.length ? uniqueValues.join(", ") : null;
}

function formDataStringAt(values: FormDataEntryValue[], index: number) {
  const value = values[index];
  return typeof value === "string" ? value.trim() : "";
}

function contentPlatformValue(formData: FormData) {
  const otherName = text(formData, "platform_other_name");
  const selected = formData
    .getAll("platform")
    .filter((value): value is string => typeof value === "string")
    .flatMap((value) => value.split(","))
    .map((value) => value.trim())
    .filter(Boolean)
    .flatMap((value) => {
      if (value === "Outra") return otherName ? [otherName] : [];
      return [value];
    });

  const uniqueValues = Array.from(new Set([...selected, ...(otherName ? [otherName] : [])]));
  return uniqueValues.length ? uniqueValues.join(", ") : null;
}

function contentFormatValue(formData: FormData) {
  const otherName = text(formData, "format_other_name");
  const selected = formData
    .getAll("format")
    .filter((value): value is string => typeof value === "string")
    .flatMap((value) => value.split(","))
    .map((value) => value.trim())
    .filter(Boolean)
    .flatMap((value) => {
      if (value === "Outro") return otherName ? [otherName] : [];
      return [value];
    });

  const uniqueValues = Array.from(new Set([...selected, ...(otherName ? [otherName] : [])]));
  return uniqueValues.length ? uniqueValues.join(", ") : null;
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

async function currentOperationalProfile() {
  const cookieStore = await cookies();
  return (
    getOperationalProfile(cookieStore.get(OPERATIONAL_PROFILE_COOKIE)?.value) ??
    fallbackOperationalProfile()
  );
}

function mentionedProfileKeys(formData: FormData) {
  return Array.from(
    new Set(
      formData
        .getAll("mentioned_profile_keys")
        .filter((value): value is string => typeof value === "string")
        .filter(isOperationalProfileKey),
    ),
  );
}

function clientColorKeyValue(formData: FormData): ClientColorKey {
  const value = text(formData, "color_key");
  return clientColorKeys.includes(value as ClientColorKey) ? (value as ClientColorKey) : "slate";
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
      color_key: clientColorKeyValue(formData),
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
      color_key: clientColorKeyValue(formData),
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
  const payload = {
    client_id: requiredText(formData, "client_id"),
    month: requiredText(formData, "month"),
    publish_date: text(formData, "publish_date"),
    publish_time: text(formData, "publish_time"),
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
    platform: contentPlatformValue(formData) ?? "Sem plataforma",
    format: contentFormatValue(formData),
    title: requiredText(formData, "title"),
    creative_brief: text(formData, "creative_brief"),
    copy_text: text(formData, "copy_text"),
    status: requiredText(formData, "status") as ContentStatus,
    assignee_name: textList(formData, "assignee_name"),
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

  return payload;
}

type ContentPayload = ReturnType<typeof contentPayload>;
type ContentInsertPayload = Omit<ContentItem, "id" | "created_at" | "updated_at" | "clients">;

function contentPayloadWithoutPublishTime(payload: ContentPayload) {
  const fallbackPayload: Partial<ContentPayload> = { ...payload };
  delete fallbackPayload.publish_time;
  return fallbackPayload as ContentPayload;
}

function contentInsertPayloadWithoutPublishTime(payload: ContentInsertPayload) {
  const fallbackPayload: Partial<ContentInsertPayload> = { ...payload };
  delete fallbackPayload.publish_time;
  return fallbackPayload as ContentInsertPayload;
}

function isMissingPublishTimeColumnError(error: { message?: string; code?: string } | null) {
  return Boolean(
    error &&
      error.code === "PGRST204" &&
      error.message?.includes("'publish_time' column"),
  );
}

export async function createContentAction(formData: FormData) {
  const supabase = supabaseOrRedirect("/content");
  const payload = contentPayload(formData);
  const { error } = await supabase.from("content_items").insert(payload);

  if (isMissingPublishTimeColumnError(error)) {
    const fallback = await supabase.from("content_items").insert(contentPayloadWithoutPublishTime(payload));
    if (fallback.error) throw new Error(fallback.error.message);
  } else if (error) {
    throw new Error(error.message);
  }
  refreshAll();
  redirect("/content");
}

export async function bulkCreateContentAction(formData: FormData): Promise<BulkCreateContentResult> {
  const supabase = getSupabase();

  if (!supabase) {
    return { ok: false, message: "Modo demo: configure o Supabase para criar conteúdos." };
  }

  const clientId = requiredText(formData, "client_id");
  const month = requiredText(formData, "month");
  const status = requiredText(formData, "status") as ContentStatus;
  const globalAssignee = text(formData, "global_assignee_name");
  const defaultPlatform = text(formData, "default_platform") ?? "Sem plataforma";
  const defaultFormat = text(formData, "default_format");
  const publishDates = formData.getAll("row_publish_date");
  const publishTimes = formData.getAll("row_publish_time");
  const platforms = formData.getAll("row_platform");
  const formats = formData.getAll("row_format");
  const titles = formData.getAll("row_title");
  const assignees = formData.getAll("row_assignee_name");

  const rowCount = Math.max(
    publishDates.length,
    publishTimes.length,
    platforms.length,
    formats.length,
    titles.length,
    assignees.length,
  );

  const payloads: ContentInsertPayload[] = [];

  for (let index = 0; index < rowCount; index += 1) {
    const title = formDataStringAt(titles, index);
    const publishDate = formDataStringAt(publishDates, index);

    if (!title && !publishDate) continue;

    if (!title) {
      return { ok: false, message: `A linha ${index + 1} precisa de título.` };
    }

    if (!publishDate) {
      return { ok: false, message: `A linha ${index + 1} precisa de data de publicação.` };
    }

    const publishTime = formDataStringAt(publishTimes, index);
    const platform = formDataStringAt(platforms, index);
    const format = formDataStringAt(formats, index);
    const assignee = formDataStringAt(assignees, index);

    payloads.push({
      client_id: clientId,
      month,
      publish_date: publishDate,
      publish_time: publishTime || null,
      design_due_date: null,
      copy_due_date: null,
      approval_due_date: null,
      publishing_due_date: null,
      design_status: null,
      copy_status: null,
      approval_status: null,
      publishing_status: null,
      needs_design: true,
      needs_copy: true,
      needs_client_approval: false,
      platform: platform || defaultPlatform,
      format: format || defaultFormat,
      title,
      creative_brief: null,
      copy_text: null,
      status,
      assignee_name: assignee || globalAssignee,
      media_url: null,
      brief_url: null,
      media_folder_url: null,
      figma_url: null,
      export_url: null,
      delivery_url: null,
      inspiration_url: null,
      published_url: null,
      internal_review_notes: null,
      client_feedback: null,
      is_blocked: false,
      blocker_reason: null,
      recording_date: null,
      notes: null,
    });
  }

  if (!payloads.length) {
    return { ok: false, message: "Adicione pelo menos uma linha com data e título." };
  }

  const { error } = await supabase.from("content_items").insert(payloads);

  if (isMissingPublishTimeColumnError(error)) {
    const fallback = await supabase
      .from("content_items")
      .insert(payloads.map(contentInsertPayloadWithoutPublishTime));
    if (fallback.error) return { ok: false, message: fallback.error.message };
  } else if (error) {
    return { ok: false, message: error.message };
  }

  refreshAll();
  return { ok: true, createdCount: payloads.length };
}

export async function listContentCommentsAction(contentId: string): Promise<ContentCommentsResult> {
  const supabase = getSupabase();

  if (!supabase) {
    return { ok: true, comments: [] };
  }

  const { data, error } = await supabase
    .from("content_comments")
    .select("*")
    .eq("content_id", contentId)
    .order("created_at", { ascending: true });

  if (error) return { ok: false, message: error.message };
  return { ok: true, comments: data as ContentComment[] };
}

export async function createContentCommentAction(formData: FormData): Promise<ContentCommentMutationResult> {
  const supabase = getSupabase();

  if (!supabase) {
    return { ok: false, message: "Modo demo: configure o Supabase para comentar." };
  }

  const profile = await currentOperationalProfile();
  const contentId = text(formData, "content_id");
  const body = text(formData, "body");

  if (!contentId) {
    return { ok: false, message: "Conteúdo em falta para comentar." };
  }

  if (!body) {
    return { ok: false, message: "Escreva um comentário antes de enviar." };
  }

  const { data, error } = await supabase
    .from("content_comments")
    .insert({
      content_id: contentId,
      author_profile_key: profile.key,
      author_name: profile.name,
      body,
      mentioned_profile_keys: mentionedProfileKeys(formData),
    })
    .select("*")
    .single();

  if (error) return { ok: false, message: error.message };

  revalidatePath("/content");
  revalidatePath(`/content/${contentId}/edit`);
  return { ok: true, comment: data as ContentComment };
}

export async function deleteContentCommentAction(commentId: string): Promise<ContentCommentMutationResult> {
  const supabase = getSupabase();

  if (!supabase) {
    return { ok: false, message: "Modo demo: configure o Supabase para apagar comentários." };
  }

  const profile = await currentOperationalProfile();
  const { data: comment, error: readError } = await supabase
    .from("content_comments")
    .select("*")
    .eq("id", commentId)
    .maybeSingle();

  if (readError) return { ok: false, message: readError.message };
  if (!comment) return { ok: false, message: "Comentário não encontrado." };

  const canDelete =
    profile.key === "guilherme" || comment.author_profile_key === profile.key;

  if (!canDelete) {
    return { ok: false, message: "Só o autor ou o Guilherme podem apagar este comentário." };
  }

  const { error } = await supabase.from("content_comments").delete().eq("id", commentId);

  if (error) return { ok: false, message: error.message };

  revalidatePath("/content");
  revalidatePath(`/content/${comment.content_id}/edit`);
  return { ok: true };
}

async function updateContent(id: string, formData: FormData) {
  const supabase = supabaseOrError();
  const payload = contentPayload(formData);
  const { error } = await supabase
    .from("content_items")
    .update(payload)
    .eq("id", id);

  if (isMissingPublishTimeColumnError(error)) {
    const fallback = await supabase
      .from("content_items")
      .update(contentPayloadWithoutPublishTime(payload))
      .eq("id", id);
    if (fallback.error) throw new Error(fallback.error.message);
  } else if (error) {
    throw new Error(error.message);
  }
  refreshAll();
}

export async function updateContentInlineAction(id: string, formData: FormData) {
  await updateContent(id, formData);
}

export async function updateContentAction(id: string, formData: FormData) {
  const supabase = supabaseOrRedirect("/content");
  const payload = contentPayload(formData);
  const { error } = await supabase
    .from("content_items")
    .update(payload)
    .eq("id", id);

  if (isMissingPublishTimeColumnError(error)) {
    const fallback = await supabase
      .from("content_items")
      .update(contentPayloadWithoutPublishTime(payload))
      .eq("id", id);
    if (fallback.error) throw new Error(fallback.error.message);
  } else if (error) {
    throw new Error(error.message);
  }
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
  const supabase = getSupabase();

  if (!supabase) {
    return {
      ok: false,
      message: "Modo demo: configure o Supabase para gravar alterações.",
    } satisfies QuickTodoActionResult;
  }

  const { data, error } = await supabase
    .from("quick_todos")
    .insert({
      view,
      profile_key: profileKey,
      text: requiredText(formData, "text"),
      item_type: itemType,
      done: false,
    })
    .select("*")
    .single();

  if (error) return { ok: false, message: error.message };
  revalidatePath("/");
  return { ok: true, todo: data };
}

export async function toggleQuickTodoAction(id: string, formData: FormData) {
  const profileKey = quickProfileKeyValue(formData);
  const supabase = getSupabase();

  if (!supabase) {
    return {
      ok: false,
      message: "Modo demo: configure o Supabase para gravar alterações.",
    } satisfies QuickTodoActionResult;
  }

  const { data, error } = await supabase
    .from("quick_todos")
    .update({ done: checked(formData, "done") })
    .eq("id", id)
    .eq("profile_key", profileKey)
    .select("*")
    .single();

  if (error) return { ok: false, message: error.message };
  revalidatePath("/");
  return { ok: true, todo: data };
}

export async function updateQuickTodoAction(id: string, formData: FormData) {
  const profileKey = quickProfileKeyValue(formData);
  const supabase = getSupabase();

  if (!supabase) {
    return {
      ok: false,
      message: "Modo demo: configure o Supabase para gravar alterações.",
    } satisfies QuickTodoActionResult;
  }

  const { data, error } = await supabase
    .from("quick_todos")
    .update({ text: requiredText(formData, "text") })
    .eq("id", id)
    .eq("profile_key", profileKey)
    .select("*")
    .single();

  if (error) return { ok: false, message: error.message };
  revalidatePath("/");
  return { ok: true, todo: data };
}

export async function deleteQuickTodoAction(id: string, formData: FormData) {
  const profileKey = quickProfileKeyValue(formData);
  const supabase = getSupabase();

  if (!supabase) {
    return {
      ok: false,
      message: "Modo demo: configure o Supabase para gravar alterações.",
    } satisfies QuickTodoActionResult;
  }

  const { error } = await supabase
    .from("quick_todos")
    .delete()
    .eq("id", id)
    .eq("profile_key", profileKey);

  if (error) return { ok: false, message: error.message };
  revalidatePath("/");
  return { ok: true };
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

export async function saveQuickNoteAction(formData: FormData) {
  const view = quickTodoViewValue(formData);
  const profileKey = quickProfileKeyValue(formData);
  const noteId = text(formData, "note_id");
  const noteText = String(formData.get("text") ?? "");
  const trimmedNoteText = noteText.trim();
  const supabase = getSupabase();

  if (!supabase) {
    return {
      ok: false,
      message: "Modo demo: configure o Supabase para gravar alterações.",
    } satisfies QuickNoteActionResult;
  }

  if (!noteId && !trimmedNoteText) {
    return { ok: true } satisfies QuickNoteActionResult;
  }

  if (noteId && !trimmedNoteText) {
    const { error } = await supabase
      .from("quick_notes")
      .delete()
      .eq("id", noteId)
      .eq("profile_key", profileKey);

    if (error) return { ok: false, message: error.message };
    revalidatePath("/");
    return { ok: true } satisfies QuickNoteActionResult;
  }

  const query = noteId
    ? supabase
        .from("quick_notes")
        .update({ text: trimmedNoteText })
        .eq("id", noteId)
        .eq("profile_key", profileKey)
    : supabase.from("quick_notes").insert({
        view,
        profile_key: profileKey,
        text: trimmedNoteText,
      });

  const { data, error } = await query.select("*").single();

  if (error) return { ok: false, message: error.message };
  revalidatePath("/");
  return { ok: true, note: data };
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
