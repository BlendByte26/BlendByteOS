import { getSupabase, isSupabaseSchemaError } from "./supabase";
import type {
  CommercialOpportunity,
  CommercialQuote,
  CommercialQuoteItem,
  CommercialService,
} from "./types";

export type CommercialWorkspaceData = {
  services: CommercialService[];
  opportunities: CommercialOpportunity[];
  quotes: CommercialQuote[];
  schemaReady: boolean;
};

export async function getCommercialWorkspaceData(): Promise<CommercialWorkspaceData> {
  const supabase = await getSupabase();
  if (!supabase) {
    return { services: [], opportunities: [], quotes: [], schemaReady: false };
  }

  const [servicesResult, opportunitiesResult, quotesResult] = await Promise.all([
    supabase
      .from("commercial_services")
      .select("*")
      .order("category")
      .order("sort_order")
      .order("name"),
    supabase
      .from("commercial_opportunities")
      .select("*, clients(id, name, client_code, short_name)")
      .order("created_at", { ascending: false }),
    supabase
      .from("commercial_quotes")
      .select("*, commercial_opportunities(id, company_name, status, is_funded, funding_program, funding_notice)")
      .order("created_at", { ascending: false }),
  ]);

  const errors = [servicesResult.error, opportunitiesResult.error, quotesResult.error].filter(Boolean);
  if (errors.length) {
    const schemaMissing = errors.some((error) => isSupabaseSchemaError(error));
    console.error("Erro ao carregar área Comercial", errors.map((error) => error?.code));
    return { services: [], opportunities: [], quotes: [], schemaReady: !schemaMissing };
  }

  return {
    services: (servicesResult.data ?? []) as CommercialService[],
    opportunities: (opportunitiesResult.data ?? []) as CommercialOpportunity[],
    quotes: (quotesResult.data ?? []) as CommercialQuote[],
    schemaReady: true,
  };
}

export async function getCommercialService(id: string) {
  const supabase = await getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("commercial_services")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    console.error("Erro ao carregar serviço comercial", { code: error.code });
    return null;
  }
  return data as CommercialService | null;
}

export async function getCommercialOpportunity(id: string) {
  const supabase = await getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("commercial_opportunities")
    .select("*, clients(id, name, client_code, short_name)")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    console.error("Erro ao carregar oportunidade comercial", { code: error.code });
    return null;
  }
  return data as CommercialOpportunity | null;
}

export async function getCommercialQuote(id: string) {
  const supabase = await getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("commercial_quotes")
    .select("*, commercial_opportunities(id, company_name, status, is_funded, funding_program, funding_notice)")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    console.error("Erro ao carregar orçamento comercial", { code: error.code });
    return null;
  }
  return data as CommercialQuote | null;
}

export async function getCommercialQuoteItems(quoteId: string) {
  const supabase = await getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("commercial_quote_items")
    .select("*")
    .eq("quote_id", quoteId)
    .order("position")
    .order("created_at");
  if (error) {
    console.error("Erro ao carregar linhas do orçamento", { code: error.code });
    return [];
  }
  return (data ?? []) as CommercialQuoteItem[];
}
