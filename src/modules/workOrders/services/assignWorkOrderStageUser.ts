import { supabase } from "@/integrations/supabase/client";
import type {
  WorkOrderPipelineStageKey,
  WorkOrderStageAssignmentRow,
} from "../types";
import { recordWorkOrderAudit } from "./recordWorkOrderAudit";

export interface AssignWorkOrderStageUserInput {
  workOrderId: string;
  businessId: string;
  stageKey: WorkOrderPipelineStageKey;
  assignedToUserId: string;
  assignedByUserId: string;
  notes?: string | null;
}

/**
 * Assigns an operator to a pipeline stage. Soft-supersedes any previously
 * active assignment for the same (work_order, stage) pair before inserting.
 */
export async function assignWorkOrderStageUser(
  input: AssignWorkOrderStageUserInput,
): Promise<{ data: WorkOrderStageAssignmentRow | null; error: unknown }> {
  // Soft-supersede any active assignment for this (work_order, stage).
  await supabase
    .from("work_order_stage_assignments")
    .update({ unassigned_at: new Date().toISOString() })
    .eq("work_order_id", input.workOrderId)
    .eq("stage_key", input.stageKey)
    .is("unassigned_at", null);

  const { data, error } = await supabase
    .from("work_order_stage_assignments")
    .insert({
      work_order_id: input.workOrderId,
      business_id: input.businessId,
      stage_key: input.stageKey,
      assigned_to_user_id: input.assignedToUserId,
      assigned_by_user_id: input.assignedByUserId,
      notes: input.notes ?? null,
    })
    .select(
      "id, ref_id, work_order_id, business_id, stage_key, assigned_to_user_id, assigned_by_user_id, assigned_at, unassigned_at, notes, created_at, updated_at",
    )
    .single();

  if (!error && data) {
    await recordWorkOrderAudit({
      business_id: input.businessId,
      actor_id: input.assignedByUserId,
      entity_id: input.workOrderId,
      action: "work_order.operator_assigned",
      metadata: { stage_key: input.stageKey },
    });
  }

  return {
    data: (data as WorkOrderStageAssignmentRow | null) ?? null,
    error,
  };
}

export async function listWorkOrderStageAssignments(options: {
  workOrderId: string;
  activeOnly?: boolean;
}): Promise<{ data: WorkOrderStageAssignmentRow[] | null; error: unknown }> {
  let q = supabase
    .from("work_order_stage_assignments")
    .select(
      "id, ref_id, work_order_id, business_id, stage_key, assigned_to_user_id, assigned_by_user_id, assigned_at, unassigned_at, notes, created_at, updated_at",
    )
    .eq("work_order_id", options.workOrderId)
    .order("assigned_at", { ascending: false });
  if (options.activeOnly !== false) q = q.is("unassigned_at", null);
  const { data, error } = await q;
  return {
    data: (data as WorkOrderStageAssignmentRow[] | null) ?? null,
    error,
  };
}