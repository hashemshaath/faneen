/**
 * BUSINESS-WORKFLOW-5C — Lock a draft BOQ as finalized.
 * Recomputes totals first, then flips status. After this, RLS prevents
 * any further item or header mutation. No quotation, no invoicing, no
 * notifications.
 */
import { supabase } from "@/integrations/supabase/client";
import { recomputeBoqTotals } from "./recomputeBoqTotals";
import { recordWorkOrderAudit } from "./recordWorkOrderAudit";
import type { WorkOrderBoqRow } from "../types";

export async function finalizeBoq(input: {
  boq_id: string;
  actor_id: string;
}): Promise<{ data: WorkOrderBoqRow | null; error: unknown }> {
  const recompute = await recomputeBoqTotals(input.boq_id);
  if (recompute.error) return { data: null, error: recompute.error };

  const { data, error } = await supabase
    .from("work_order_boqs")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .update({
      status: "finalized",
      finalized_by: input.actor_id,
    } as any)
    .eq("id", input.boq_id)
    .eq("status", "draft")
    .select(
      "id, ref_id, work_order_id, business_id, title, status, notes, subtotal, tax, total, created_by, finalized_at, finalized_by, created_at, updated_at, deleted_at",
    )
    .maybeSingle();

  if (!error && data) {
    await recordWorkOrderAudit({
      business_id: data.business_id,
      actor_id: input.actor_id,
      entity_id: data.work_order_id,
      action: "work_order.boq_finalized",
      metadata: {
        boq_id: data.id,
        ref_id: data.ref_id,
        total: data.total,
      },
    });
  }

  return { data: (data as WorkOrderBoqRow | null) ?? null, error };
}