import { supabase } from "@/integrations/supabase/client";

/**
 * BUSINESS-ADMIN-4 — Admin-safe task summary (TASK-…) including parent WO ref.
 *
 * Read-only. RLS authoritative (same family as work_orders).
 * Never exposes assignee identity, comments, raw UUIDs as labels.
 */
export interface AdminTaskSummary {
  ref_id: string;
  entity_type: "work_order_task";
  label: string | null;
  status: string | null;
  priority: string | null;
  business_ref_id: null;
  /** Parent WO ref (WO-…). */
  source_ref_id: string | null;
  created_at: string | null;
  updated_at: string | null;
  canonical_route: string | null;
}

export async function getAdminTaskSummaryByRef(input: {
  refId: string;
}): Promise<{ data: AdminTaskSummary | null; error: unknown }> {
  const refId = (input.refId ?? "").trim().toUpperCase();
  if (!refId.startsWith("TASK-")) return { data: null, error: null };

  const { data, error } = await supabase
    .from("work_order_tasks")
    .select(
      "id, ref_id, work_order_id, title, status, priority, created_at, updated_at, work_orders!inner(ref_id)",
    )
    .eq("ref_id", refId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error || !data) return { data: null, error };
  const row = data as {
    id: string;
    ref_id: string;
    work_order_id: string;
    title: string | null;
    status: string | null;
    priority: string | null;
    created_at: string | null;
    updated_at: string | null;
    work_orders?: { ref_id: string | null } | null;
  };
  const woRef = row.work_orders?.ref_id ?? null;

  return {
    data: {
      ref_id: row.ref_id,
      entity_type: "work_order_task",
      label: row.title ?? null,
      status: row.status ?? null,
      priority: row.priority ?? null,
      business_ref_id: null,
      source_ref_id: woRef && /^WO-[A-Z0-9]+$/.test(woRef) ? woRef : null,
      created_at: row.created_at ?? null,
      updated_at: row.updated_at ?? null,
      canonical_route: `/dashboard/work-orders/${row.work_order_id}?task=${row.ref_id}`,
    },
    error: null,
  };
}