import { supabase } from "@/integrations/supabase/client";

/**
 * BUSINESS-CORE-6 — Resolve a TASK-* ref_id to its parent work order.
 *
 * Returns the task's `work_order_id` plus the parent's `ref_id` (WO-*) so the
 * UI/resolver can deep-link to the work-order detail page with an optional
 * `?task=TASK-…` highlight parameter. RLS authoritative — the join is gated
 * by membership in `is_work_order_member` because both tables share the same
 * policy family.
 */
export interface GetWorkOrderTaskByRefIdResult {
  task_id: string;
  task_ref_id: string;
  work_order_id: string;
  work_order_ref_id: string;
}

export async function getWorkOrderTaskByRefId(
  refId: string,
): Promise<{ data: GetWorkOrderTaskByRefIdResult | null; error: unknown }> {
  if (!refId) return { data: null, error: null };
  const { data, error } = await supabase
    .from("work_order_tasks")
    .select("id, ref_id, work_order_id, work_orders!inner(ref_id)")
    .eq("ref_id", refId)
    .is("deleted_at", null)
    .maybeSingle();
  if (error || !data) return { data: null, error };
  const woRef = (data as { work_orders?: { ref_id: string | null } }).work_orders?.ref_id ?? null;
  if (!woRef) return { data: null, error: null };
  return {
    data: {
      task_id: (data as { id: string }).id,
      task_ref_id: (data as { ref_id: string }).ref_id,
      work_order_id: (data as { work_order_id: string }).work_order_id,
      work_order_ref_id: woRef,
    },
    error: null,
  };
}