import { supabase } from "@/integrations/supabase/client";

/**
 * BUSINESS-ADMIN-4 — Admin-safe contract summary by official ref (CNT-…).
 *
 * Read-only. RLS authoritative (admins gated by `has_role`).
 * Never returns: tokens, provider_intent_id, synthetic emails, supervisor
 * phone/email, financial terms, raw UUIDs as display labels.
 */
export interface AdminContractSummary {
  ref_id: string;
  entity_type: "contract";
  label: string | null;
  status: string | null;
  priority: null;
  business_ref_id: null;
  source_ref_id: null;
  created_at: string | null;
  updated_at: string | null;
  canonical_route: string | null;
}

export async function getAdminContractSummaryByRef(input: {
  refId: string;
}): Promise<{ data: AdminContractSummary | null; error: unknown }> {
  const refId = (input.refId ?? "").trim().toUpperCase();
  if (!refId.startsWith("CNT-")) return { data: null, error: null };

  const { data, error } = await supabase
    .from("contracts")
    .select("id, contract_number, title_ar, title_en, status, created_at, updated_at")
    .eq("contract_number", refId)
    .maybeSingle();

  if (error || !data) return { data: null, error };
  const row = data as {
    id: string;
    contract_number: string;
    title_ar: string | null;
    title_en: string | null;
    status: string | null;
    created_at: string | null;
    updated_at: string | null;
  };

  return {
    data: {
      ref_id: row.contract_number,
      entity_type: "contract",
      label: row.title_ar ?? row.title_en ?? null,
      status: row.status ?? null,
      priority: null,
      business_ref_id: null,
      source_ref_id: null,
      created_at: row.created_at ?? null,
      updated_at: row.updated_at ?? null,
      canonical_route: `/contracts/${row.id}`,
    },
    error: null,
  };
}