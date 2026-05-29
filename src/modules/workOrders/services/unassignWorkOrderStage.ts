import { supabase } from "@/integrations/supabase/client";
import type { WorkOrderPipelineStageKey } from "../types";
import { recordWorkOrderAudit } from "./recordWorkOrderAudit";

export interface UnassignWorkOrderStageInput {
  workOrderId: string;
  businessId: string;
  stageKey: WorkOrderPipelineStageKey;
  actorUserId: string;
}

/**
 * BUSINESS-WORKFLOW-PRODUCTION-2 — Soft-unassign the active operator
 * for a (work_order, stage) pair. No new row is inserted; the existing
 * active row is closed via `unassigned_at`. RLS on
 * `work_order_stage_assignments` continues to enforce manager access.
 */
export async function unassignWorkOrderStage(
  input: UnassignWorkOrderStageInput,
): Promise<{ data: { ok: true } | null; error: unknown }> {
  const { error } = await supabase
    .from("work_order_stage_assignments")
    .update({ unassigned_at: new Date().toISOString() })
    .eq("work_order_id", input.workOrderId)
    .eq("stage_key", input.stageKey)
    .is("unassigned_at", null);
  if (error) return { data: null, error };

  await recordWorkOrderAudit({
    business_id: input.businessId,
    actor_id: input.actorUserId,
    entity_id: input.workOrderId,
    action: "work_order.operator_unassigned",
    metadata: { stage_key: input.stageKey },
  });

  return { data: { ok: true }, error: null };
}