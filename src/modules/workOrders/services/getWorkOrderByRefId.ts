import { supabase } from "@/integrations/supabase/client";
import type { WorkOrderRow } from "../types";

/**
 * BUSINESS-CORE-5 — canonical wrapper for resolving a work order by its
 * public reference id (e.g. `WO-1000007`). RLS remains authoritative.
 * Returns `{ data: null }` when not found instead of throwing.
 */
export async function getWorkOrderByRefId(
  refId: string,
): Promise<{ data: WorkOrderRow | null; error: unknown }> {
  const trimmed = (refId ?? "").trim();
  if (!trimmed) return { data: null, error: null };
  const { data, error } = await supabase
    .from("work_orders")
    .select(
      "id, ref_id, business_id, source_type, source_id, title, customer_name, customer_phone, status, current_stage_key, priority, owner_user_id, created_by_user_id, due_at, completed_at, created_at, updated_at, deleted_at",
    )
    .eq("ref_id", trimmed)
    .is("deleted_at", null)
    .maybeSingle();
  return { data: (data as WorkOrderRow | null) ?? null, error };
}