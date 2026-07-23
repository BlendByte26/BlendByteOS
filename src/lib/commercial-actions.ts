"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { assertNotAdminPreviewMode } from "./admin-preview";
import { requireCommercialAccess } from "./auth";
import {
  isCommercialOpportunitySource,
  isCommercialOpportunityStatus,
  isCommercialQuoteStatus,
  isCommercialServicePriceStatus,
} from "./commercial";
import { getSupabase } from "./supabase";

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function requiredText(formData: FormData, key: string, label: string) {
  const value = text(formData, key);
  if (!value) throw new Error(`Preenche ${label}.`);
  return value;
}

function optionalText(formData: FormData, key: string) {
  return text(formData, key) || null;
}

function decimalValue(formData: FormData, key: string, label: string) {
  const raw = requiredText(formData, key, label).replace(/\s/g, "").replace(",", ".");
  const value = Number(raw);
  if (!Number.isFinite(value)) throw new Error(`${label} tem de ser um número válido.`);
  return value;
}

function optionalDecimalValue(formData: FormData, key: string, label: string) {
  const raw = text(formData, key);
  if (!raw) return null;
  const value = Number(raw.replace(/\s/g, "").replace(",", "."));
  if (!Number.isFinite(value)) throw new Error(`${label} tem de ser um número válido.`);
  return value;
}

function optionalIntegerValue(formData: FormData, key: string, label: string) {
  const value = optionalDecimalValue(formData, key, label);
  if (value == null) return null;
  if (!Number.isInteger(value)) throw new Error(`${label} tem de ser um número inteiro.`);
  return value;
}

function positiveIntegerValue(formData: FormData, key: string, label: string) {
  const value = decimalValue(formData, key, label);
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`${label} tem de ser um número inteiro igual ou superior a 1.`);
  }
  return value;
}

function checkbox(formData: FormData, key: string) {
  return formData.get(key) === "on";
}

async function commercialSupabase() {
  await assertNotAdminPreviewMode();
  await requireCommercialAccess();
  const supabase = await getSupabase();
  if (!supabase) throw new Error("Modo demo: configura o Supabase para guardar dados comerciais.");
  return supabase;
}

function refreshCommercial(extraPath?: string) {
  revalidatePath("/commercial");
  if (extraPath) revalidatePath(extraPath);
}

function currentLisbonYear() {
  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    timeZone: "Europe/Lisbon",
  }).format(new Date());
}

export async function createCommercialServiceAction(formData: FormData) {
  const supabase = await commercialSupabase();
  const standardPrice = decimalValue(formData, "standard_price", "o preço-base");
  const minimumPrice = decimalValue(formData, "minimum_price", "o preço mínimo");
  const priceStatus = text(formData, "price_status");

  if (minimumPrice > standardPrice) {
    throw new Error("O preço mínimo não pode ser superior ao preço-base.");
  }
  if (!isCommercialServicePriceStatus(priceStatus)) {
    throw new Error("Estado de preço inválido.");
  }

  const { error } = await supabase.from("commercial_services").insert({
    code: requiredText(formData, "code", "o código"),
    category: requiredText(formData, "category", "a categoria"),
    name: requiredText(formData, "name", "o nome do serviço"),
    summary: optionalText(formData, "summary"),
    unit: requiredText(formData, "unit", "a unidade"),
    standard_price: standardPrice,
    minimum_price: minimumPrice,
    price_status: priceStatus,
    version_label: requiredText(formData, "version_label", "a versão"),
    inclusions: optionalText(formData, "inclusions"),
    exclusions: optionalText(formData, "exclusions"),
    internal_notes: optionalText(formData, "internal_notes"),
    active: checkbox(formData, "active"),
    sort_order: optionalIntegerValue(formData, "sort_order", "a ordem") ?? 0,
  });

  if (error) {
    if (error.code === "23505") throw new Error("Já existe um serviço com este código.");
    throw new Error(`Não foi possível criar o serviço: ${error.message}`);
  }

  refreshCommercial();
  redirect("/commercial?tab=catalog");
}

export async function updateCommercialServiceAction(id: string, formData: FormData) {
  const supabase = await commercialSupabase();
  const standardPrice = decimalValue(formData, "standard_price", "o preço-base");
  const minimumPrice = decimalValue(formData, "minimum_price", "o preço mínimo");
  const priceStatus = text(formData, "price_status");

  if (minimumPrice > standardPrice) {
    throw new Error("O preço mínimo não pode ser superior ao preço-base.");
  }
  if (!isCommercialServicePriceStatus(priceStatus)) {
    throw new Error("Estado de preço inválido.");
  }

  const { error } = await supabase
    .from("commercial_services")
    .update({
      code: requiredText(formData, "code", "o código"),
      category: requiredText(formData, "category", "a categoria"),
      name: requiredText(formData, "name", "o nome do serviço"),
      summary: optionalText(formData, "summary"),
      unit: requiredText(formData, "unit", "a unidade"),
      standard_price: standardPrice,
      minimum_price: minimumPrice,
      price_status: priceStatus,
      version_label: requiredText(formData, "version_label", "a versão"),
      inclusions: optionalText(formData, "inclusions"),
      exclusions: optionalText(formData, "exclusions"),
      internal_notes: optionalText(formData, "internal_notes"),
      active: checkbox(formData, "active"),
      sort_order: optionalIntegerValue(formData, "sort_order", "a ordem") ?? 0,
    })
    .eq("id", id);

  if (error) {
    if (error.code === "23505") throw new Error("Já existe um serviço com este código.");
    throw new Error(`Não foi possível atualizar o serviço: ${error.message}`);
  }

  refreshCommercial(`/commercial/services/${id}/edit`);
  redirect("/commercial?tab=catalog");
}

function opportunityPayload(formData: FormData) {
  const source = text(formData, "source");
  const status = text(formData, "status");
  if (!isCommercialOpportunitySource(source)) throw new Error("Origem da oportunidade inválida.");
  if (!isCommercialOpportunityStatus(status)) throw new Error("Estado da oportunidade inválido.");

  const executionStart = optionalText(formData, "execution_start");
  const executionEnd = optionalText(formData, "execution_end");
  if (executionStart && executionEnd && executionEnd < executionStart) {
    throw new Error("O fim da execução não pode ser anterior ao início.");
  }

  return {
    company_name: requiredText(formData, "company_name", "o nome da empresa"),
    contact_name: optionalText(formData, "contact_name"),
    contact_email: optionalText(formData, "contact_email"),
    contact_phone: optionalText(formData, "contact_phone"),
    source,
    source_detail: optionalText(formData, "source_detail"),
    status,
    client_id: optionalText(formData, "client_id"),
    is_funded: checkbox(formData, "is_funded"),
    funding_program: optionalText(formData, "funding_program"),
    funding_notice: optionalText(formData, "funding_notice"),
    eligible_marketing_budget: optionalDecimalValue(
      formData,
      "eligible_marketing_budget",
      "o investimento elegível",
    ),
    execution_start: executionStart,
    execution_end: executionEnd,
    objectives: optionalText(formData, "objectives"),
    notes: optionalText(formData, "notes"),
  };
}

export async function createCommercialOpportunityAction(formData: FormData) {
  const supabase = await commercialSupabase();
  const { data, error } = await supabase
    .from("commercial_opportunities")
    .insert(opportunityPayload(formData))
    .select("id")
    .single();

  if (error) throw new Error(`Não foi possível criar a oportunidade: ${error.message}`);

  refreshCommercial();
  redirect(`/commercial/opportunities/${data.id}/edit`);
}

export async function updateCommercialOpportunityAction(id: string, formData: FormData) {
  const supabase = await commercialSupabase();
  const { error } = await supabase
    .from("commercial_opportunities")
    .update(opportunityPayload(formData))
    .eq("id", id);

  if (error) throw new Error(`Não foi possível atualizar a oportunidade: ${error.message}`);

  refreshCommercial(`/commercial/opportunities/${id}/edit`);
  redirect("/commercial?tab=opportunities");
}

export async function createCommercialQuoteAction(formData: FormData) {
  const supabase = await commercialSupabase();
  const opportunityId = requiredText(formData, "opportunity_id", "a oportunidade");
  const reference = `BB-${currentLisbonYear()}-${randomUUID().slice(0, 6).toUpperCase()}`;
  const { data, error } = await supabase
    .from("commercial_quotes")
    .insert({
      opportunity_id: opportunityId,
      reference,
      title: requiredText(formData, "title", "o título do orçamento"),
      valid_until: optionalText(formData, "valid_until"),
      funding_notes: optionalText(formData, "funding_notes"),
      commercial_conditions: optionalText(formData, "commercial_conditions"),
      internal_notes: optionalText(formData, "internal_notes"),
      created_by_profile_key: "guilherme",
    })
    .select("id")
    .single();

  if (error) throw new Error(`Não foi possível criar o orçamento: ${error.message}`);

  const { error: opportunityError } = await supabase
    .from("commercial_opportunities")
    .update({ status: "quoting" })
    .eq("id", opportunityId)
    .eq("status", "qualification");
  if (opportunityError) {
    console.error("Orçamento criado sem atualizar estado da oportunidade", {
      code: opportunityError.code,
    });
  }

  refreshCommercial();
  redirect(`/commercial/quotes/${data.id}`);
}

export async function updateCommercialQuoteAction(id: string, formData: FormData) {
  const supabase = await commercialSupabase();
  const status = text(formData, "status");
  if (!isCommercialQuoteStatus(status)) throw new Error("Estado do orçamento inválido.");

  const { data: quote, error: quoteError } = await supabase
    .from("commercial_quotes")
    .update({
      title: requiredText(formData, "title", "o título do orçamento"),
      status,
      valid_until: optionalText(formData, "valid_until"),
      funding_notes: optionalText(formData, "funding_notes"),
      commercial_conditions: optionalText(formData, "commercial_conditions"),
      internal_notes: optionalText(formData, "internal_notes"),
    })
    .eq("id", id)
    .select("opportunity_id")
    .single();

  if (quoteError) throw new Error(`Não foi possível atualizar o orçamento: ${quoteError.message}`);

  if (status === "accepted") {
    const { error: opportunityError } = await supabase
      .from("commercial_opportunities")
      .update({ status: "won" })
      .eq("id", quote.opportunity_id);
    if (opportunityError) {
      throw new Error(`O orçamento foi atualizado, mas a oportunidade não: ${opportunityError.message}`);
    }
  }

  refreshCommercial(`/commercial/quotes/${id}`);
  redirect(`/commercial/quotes/${id}`);
}

export async function addCommercialQuoteItemAction(quoteId: string, formData: FormData) {
  const supabase = await commercialSupabase();
  const serviceId = requiredText(formData, "service_id", "o serviço");
  const [
    { data: service, error: serviceError },
    { data: existingItem, error: existingItemError },
    { data: lastItem, error: positionError },
  ] =
    await Promise.all([
      supabase.from("commercial_services").select("*").eq("id", serviceId).eq("active", true).single(),
      supabase
        .from("commercial_quote_items")
        .select("id, quantity")
        .eq("quote_id", quoteId)
        .eq("service_id", serviceId)
        .order("position")
        .limit(1)
        .maybeSingle(),
      supabase
        .from("commercial_quote_items")
        .select("position")
        .eq("quote_id", quoteId)
        .order("position", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  if (serviceError || !service) throw new Error("O serviço selecionado já não está disponível.");
  if (existingItemError) {
    throw new Error(`Não foi possível verificar o orçamento: ${existingItemError.message}`);
  }
  if (positionError) throw new Error(`Não foi possível ordenar a nova linha: ${positionError.message}`);

  const quantity = positiveIntegerValue(formData, "quantity", "A quantidade");

  if (existingItem) {
    const currentQuantity = Number(existingItem.quantity);
    if (!Number.isInteger(currentQuantity) || currentQuantity < 1) {
      throw new Error("A linha existente tem uma quantidade inválida. Corrige-a antes de adicionar unidades.");
    }
    const { error } = await supabase
      .from("commercial_quote_items")
      .update({ quantity: currentQuantity + quantity })
      .eq("id", existingItem.id)
      .eq("quote_id", quoteId);
    if (error) throw new Error(`Não foi possível atualizar a quantidade: ${error.message}`);

    refreshCommercial(`/commercial/quotes/${quoteId}`);
    redirect(`/commercial/quotes/${quoteId}`);
  }

  const typedUnitPrice = optionalDecimalValue(formData, "unit_price", "o preço unitário");
  const unitPrice = typedUnitPrice ?? Number(service.standard_price);
  const overrideReason = optionalText(formData, "price_override_reason");
  if (unitPrice < Number(service.minimum_price) && !overrideReason) {
    throw new Error(
      `O preço está abaixo do mínimo de ${Number(service.minimum_price).toFixed(2)} €. Justifica a exceção.`,
    );
  }

  const { error } = await supabase.from("commercial_quote_items").insert({
    quote_id: quoteId,
    service_id: service.id,
    position: (lastItem?.position ?? 0) + 10,
    service_code: service.code,
    service_name: service.name,
    category: service.category,
    unit: service.unit,
    description: optionalText(formData, "description") ?? service.summary,
    quantity,
    unit_price: unitPrice,
    standard_unit_price: Number(service.standard_price),
    price_override_reason: overrideReason,
    eligible_category: optionalText(formData, "eligible_category"),
    evidence_notes: optionalText(formData, "evidence_notes"),
    internal_notes: optionalText(formData, "internal_notes"),
  });

  if (error) throw new Error(`Não foi possível adicionar a linha: ${error.message}`);

  refreshCommercial(`/commercial/quotes/${quoteId}`);
  redirect(`/commercial/quotes/${quoteId}`);
}

export async function updateCommercialQuoteItemAction(
  quoteId: string,
  itemId: string,
  formData: FormData,
) {
  const supabase = await commercialSupabase();
  const quantity = positiveIntegerValue(formData, "quantity", "A quantidade");
  const unitPrice = decimalValue(formData, "unit_price", "o preço unitário");
  if (unitPrice < 0) throw new Error("O preço unitário não pode ser negativo.");

  const { data: item, error: itemError } = await supabase
    .from("commercial_quote_items")
    .select("service_id")
    .eq("id", itemId)
    .eq("quote_id", quoteId)
    .single();
  if (itemError || !item) throw new Error("A linha do orçamento já não está disponível.");

  let minimumPrice = 0;
  if (item.service_id) {
    const { data: service, error: serviceError } = await supabase
      .from("commercial_services")
      .select("minimum_price")
      .eq("id", item.service_id)
      .maybeSingle();
    if (serviceError) {
      throw new Error(`Não foi possível validar o preço mínimo: ${serviceError.message}`);
    }
    minimumPrice = Number(service?.minimum_price ?? 0);
  }

  const overrideReason = optionalText(formData, "price_override_reason");
  if (unitPrice < minimumPrice && !overrideReason) {
    throw new Error(
      `O preço está abaixo do mínimo de ${minimumPrice.toFixed(2)} €. Justifica a exceção.`,
    );
  }

  const { error } = await supabase
    .from("commercial_quote_items")
    .update({
      quantity,
      unit_price: unitPrice,
      price_override_reason: overrideReason,
      description: optionalText(formData, "description"),
      eligible_category: optionalText(formData, "eligible_category"),
      evidence_notes: optionalText(formData, "evidence_notes"),
      internal_notes: optionalText(formData, "internal_notes"),
    })
    .eq("id", itemId)
    .eq("quote_id", quoteId);
  if (error) throw new Error(`Não foi possível atualizar a linha: ${error.message}`);

  refreshCommercial(`/commercial/quotes/${quoteId}`);
  redirect(`/commercial/quotes/${quoteId}`);
}

export async function removeCommercialQuoteItemAction(
  quoteId: string,
  itemId: string,
) {
  const supabase = await commercialSupabase();
  const { error } = await supabase
    .from("commercial_quote_items")
    .delete()
    .eq("id", itemId)
    .eq("quote_id", quoteId);
  if (error) throw new Error(`Não foi possível remover a linha: ${error.message}`);

  refreshCommercial(`/commercial/quotes/${quoteId}`);
  redirect(`/commercial/quotes/${quoteId}`);
}
