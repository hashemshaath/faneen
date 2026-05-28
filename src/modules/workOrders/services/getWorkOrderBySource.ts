import { supabase } from "@/integrations/supabase/client";
import type { WorkOrderRow } from "../types";

export interface GetWorkOrderBySourceInput {
  sourceType: "lead" | "quote" | "contract" | "booking";
  sourceId: string;
  businessId?: string;
}

/**
 * BUSINESS-WORKFLOW-2 — Look up the active work order (if any) created from
 * a given source row. Used to switch the conversion UI into "Open Work Order"
 * mode and avoid duplicate conversions.
 *
 * - Returns the most recent non-deleted match (DB has a partial unique index
 *   `uniq_work_orders_source_pair_active` so at most one is expected).
 * - RLS authoritative — never bypassed. No PII selected beyond what the
 *   normal work_orders list already exposes (`ref_id` is the only field the
 *   conversion UI needs).
 */
export async function getWorkOrderBySource(
  input: GetWorkOrderBySourceInput,
): Promise<{ data: WorkOrderRow | null; error: unknown }> {
  if (!input.sourceType || !input.sourceId) {
    return { data: null, error: null };
  }
  let q = supabase
    .from("work_orders")
    .select(
      "id, ref_id, business_id, source_type, source_id, source_ref_id, title, customer_name, customer_phone, status, current_stage_key, priority, owner_user_id, created_by_user_id, due_at, completed_at, created_at, updated_at, deleted_at",
    )
    .eq("source_type", input.sourceType)
    .eq("source_id", input.sourceId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(1);

  if (input.businessId) q = q.eq("business_id", input.businessId);

  const { data, error } = await q.maybeSingle();
  return { data: (data as WorkOrderRow | null) ?? null, error };
}

export default getWorkOrderBySource;