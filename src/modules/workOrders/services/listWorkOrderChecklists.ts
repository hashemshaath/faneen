import { supabase } from "@/integrations/supabase/client";
import type {
  WorkOrderChecklistRow,
  WorkOrderChecklistItemRow,
} from "../types";

export async function listWorkOrderChecklists(options: {
  workOrderId: string;
}): Promise<{ data: WorkOrderChecklistRow[] | null; error: unknown }> {
  const { data, error } = await supabase
    .from("work_order_checklists")
    .select(
      "id, ref_id, work_order_id, business_id, checklist_type, sector_key, title, status, assigned_to_user_id, created_by, completed_at, created_at, updated_at, deleted_at",
    )
    .eq("work_order_id", options.workOrderId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });
  return {
    data: (data as WorkOrderChecklistRow[] | null) ?? null,
    error,
  };
}

export async function listChecklistItems(options: {
  checklistId: string;
}): Promise<{ data: WorkOrderChecklistItemRow[] | null; error: unknown }> {
  const { data, error } = await supabase
    .from("work_order_checklist_items")
    .select(
      "id, ref_id, checklist_id, label, sort_order, completed, completed_by, completed_at, notes, created_at, updated_at",
    )
    .eq("checklist_id", options.checklistId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  return {
    data: (data as WorkOrderChecklistItemRow[] | null) ?? null,
    error,
  };
}