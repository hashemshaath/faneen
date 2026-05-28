import { supabase } from "@/integrations/supabase/client";
import type { WorkOrderChecklistItemRow } from "../types";
import { recordWorkOrderAudit } from "./recordWorkOrderAudit";

export interface UpdateChecklistItemPatch {
  label?: string;
  notes?: string | null;
  sort_order?: number;
}

export async function updateChecklistItem(input: {
  itemId: string;
  businessId: string;
  actorId: string;
  workOrderId: string;
  patch: UpdateChecklistItemPatch;
}): Promise<{ data: WorkOrderChecklistItemRow | null; error: unknown }> {
  const { data, error } = await supabase
    .from("work_order_checklist_items")
    .update(input.patch)
    .eq("id", input.itemId)
    .select(
      "id, ref_id, checklist_id, label, sort_order, completed, completed_by, completed_at, notes, created_at, updated_at",
    )
    .single();

  if (!error && data) {
    await recordWorkOrderAudit({
      business_id: input.businessId,
      actor_id: input.actorId,
      entity_id: input.workOrderId,
      action: "work_order.checklist_item_updated",
      metadata: { item_id: input.itemId },
    });
  }

  return {
    data: (data as WorkOrderChecklistItemRow | null) ?? null,
    error,
  };
}

export async function completeChecklistItem(input: {
  itemId: string;
  businessId: string;
  actorId: string;
  workOrderId: string;
  completed: boolean;
}): Promise<{ data: WorkOrderChecklistItemRow | null; error: unknown }> {
  const { data, error } = await supabase
    .from("work_order_checklist_items")
    .update({ completed: input.completed })
    .eq("id", input.itemId)
    .select(
      "id, ref_id, checklist_id, label, sort_order, completed, completed_by, completed_at, notes, created_at, updated_at",
    )
    .single();

  if (!error && data) {
    await recordWorkOrderAudit({
      business_id: input.businessId,
      actor_id: input.actorId,
      entity_id: input.workOrderId,
      action: "work_order.checklist_item_updated",
      metadata: { item_id: input.itemId, completed: input.completed },
    });
  }

  return {
    data: (data as WorkOrderChecklistItemRow | null) ?? null,
    error,
  };
}

/**
 * Marks the whole checklist as completed (open → completed). Manager-only via RLS.
 */
export async function completeChecklist(input: {
  checklistId: string;
  businessId: string;
  actorId: string;
  workOrderId: string;
}): Promise<{ ok: boolean; error: unknown }> {
  const { error } = await supabase
    .from("work_order_checklists")
    .update({ status: "completed" })
    .eq("id", input.checklistId);
  if (!error) {
    await recordWorkOrderAudit({
      business_id: input.businessId,
      actor_id: input.actorId,
      entity_id: input.workOrderId,
      action: "work_order.checklist_completed",
      metadata: { checklist_id: input.checklistId },
    });
  }
  return { ok: !error, error };
}