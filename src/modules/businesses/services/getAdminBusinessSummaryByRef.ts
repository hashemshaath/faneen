import { supabase } from "@/integrations/supabase/client";

/**
 * BUSINESS-ADMIN-4 — Admin-safe business/entity summary (ENT-/BIZ-…).
 *
 * Read-only. RLS authoritative.
 * Never returns: phone, email, owner identity, sensitive verification
 * fields, tokens. Only public name + approval status + canonical route.
 */
export interface AdminBusinessSummary {
  ref_id: string;
  entity_type: "business";
  label: string | null;
  status: string | null;
  priority: null;
  business_ref_id: string | null;
  source_ref_id: null;
  created_at: string | null;
  updated_at: string | null;
  canonical_route: string | null;
}

export async function getAdminBusinessSummaryByRef(input: {
  refId: string;
}): Promise<{ data: AdminBusinessSummary | null; error: unknown }> {
  const refId = (input.refId ?? "").trim().toUpperCase();
  if (!refId.startsWith("ENT-") && !refId.startsWith("BIZ-")) {
    return { data: null, error: null };
  }

  const { data, error } = await supabase
    .from("businesses")
    .select(
      "id, ref_id, username, name_ar, name_en, approval_status, created_at, updated_at",
    )
    .or(`ref_id.eq.${refId},legacy_ref_id.eq.${refId}`)
    .maybeSingle();

  if (error || !data) return { data: null, error };
  const row = data as {
    id: string;
    ref_id: string;
    username: string | null;
    name_ar: string | null;
    name_en: string | null;
    approval_status: string | null;
    created_at: string | null;
    updated_at: string | null;
  };

  return {
    data: {
      ref_id: row.ref_id,
      entity_type: "business",
      label: row.name_ar ?? row.name_en ?? null,
      status: row.approval_status ?? null,
      priority: null,
      business_ref_id: row.ref_id,
      source_ref_id: null,
      created_at: row.created_at ?? null,
      updated_at: row.updated_at ?? null,
      canonical_route: row.username ? `/${row.username}` : `/${row.id}`,
    },
    error: null,
  };
}