import { supabase } from "@/integrations/supabase/client";

/**
 * BUSINESS-ADMIN-4 — Admin-safe quote-request summary (QTE-…).
 *
 * Read-only. RLS authoritative.
 * Never returns: customer_name, customer_phone, customer_email,
 * project_description body, budget, internal notes, tokens, raw UUIDs.
 */
export interface AdminQuoteSummary {
  ref_id: string;
  entity_type: "quote";
  label: string | null;
  status: string | null;
  priority: null;
  business_ref_id: null;
  source_ref_id: null;
  created_at: string | null;
  updated_at: string | null;
  canonical_route: string | null;
}

export async function getAdminQuoteSummaryByRef(input: {
  refId: string;
}): Promise<{ data: AdminQuoteSummary | null; error: unknown }> {
  const refId = (input.refId ?? "").trim().toUpperCase();
  if (!refId.startsWith("QTE-")) return { data: null, error: null };

  const { data, error } = await supabase
    .from("quote_requests")
    .select("id, ref_id, sector, city, status, created_at, updated_at")
    .eq("ref_id", refId)
    .maybeSingle();

  if (error || !data) return { data: null, error };
  const row = data as {
    id: string;
    ref_id: string;
    sector: string | null;
    city: string | null;
    status: string | null;
    created_at: string | null;
    updated_at: string | null;
  };

  const labelParts = [row.sector, row.city].filter((s): s is string => Boolean(s));
  return {
    data: {
      ref_id: row.ref_id,
      entity_type: "quote",
      label: labelParts.length > 0 ? labelParts.join(" · ") : null,
      status: row.status ?? null,
      priority: null,
      business_ref_id: null,
      source_ref_id: null,
      created_at: row.created_at ?? null,
      updated_at: row.updated_at ?? null,
      canonical_route: `/dashboard/my-requests/${row.id}`,
    },
    error: null,
  };
}