import { supabase } from "@/integrations/supabase/client";

/**
 * BUSINESS-ADMIN-4 — Admin-safe lead-request summary (LED-/LR-…).
 *
 * Read-only. RLS authoritative.
 * Never returns: name, email, phone, message body, internal_notes,
 * quote_amount, addresses, tokens, raw UUIDs.
 */
export interface AdminLeadSummary {
  ref_id: string;
  entity_type: "lead";
  label: string | null;
  status: string | null;
  priority: string | null;
  business_ref_id: null;
  source_ref_id: null;
  created_at: string | null;
  updated_at: string | null;
  canonical_route: string | null;
}

export async function getAdminLeadSummaryByRef(input: {
  refId: string;
}): Promise<{ data: AdminLeadSummary | null; error: unknown }> {
  const refId = (input.refId ?? "").trim().toUpperCase();
  if (!refId.startsWith("LED-") && !refId.startsWith("LR-")) {
    return { data: null, error: null };
  }

  const { data, error } = await supabase
    .from("lead_requests")
    .select("id, ref_id, subject, status, priority, created_at, updated_at")
    .eq("ref_id", refId)
    .maybeSingle();

  if (error || !data) return { data: null, error };
  const row = data as {
    id: string;
    ref_id: string;
    subject: string | null;
    status: string | null;
    priority: string | null;
    created_at: string | null;
    updated_at: string | null;
  };

  return {
    data: {
      ref_id: row.ref_id,
      entity_type: "lead",
      label: row.subject ?? null,
      status: row.status ?? null,
      priority: row.priority ?? null,
      business_ref_id: null,
      source_ref_id: null,
      created_at: row.created_at ?? null,
      updated_at: row.updated_at ?? null,
      canonical_route: `/dashboard/provider/leads/${row.id}`,
    },
    error: null,
  };
}