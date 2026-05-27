import { supabase } from "@/integrations/supabase/client";
import type { WorkOrderTaskRow } from "../types";

export async function listWorkOrderTasks(options: {
  workOrderId: string;
}): Promise<{ data: WorkOrderTaskRow[] | null; error: unknown }> {
  const { data, error } = await supabase
    .from("work_order_tasks")
    .select(
      "id, ref_id, work_order_id, stage_id, business_id, title, description, status, priority, assigned_to_user_id, created_by_user_id, due_at, completed_at, created_at, updated_at, deleted_at",
    )
    .eq("work_order_id", options.workOrderId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });
  return { data: (data as WorkOrderTaskRow[] | null) ?? null, error };
}