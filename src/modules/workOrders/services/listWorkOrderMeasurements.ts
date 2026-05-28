import { supabase } from "@/integrations/supabase/client";
import type { WorkOrderMeasurementRow } from "../types";

export async function listWorkOrderMeasurements(options: {
  workOrderId: string;
  taskId?: string | null;
  limit?: number;
}): Promise<{ data: WorkOrderMeasurementRow[] | null; error: unknown }> {
  const limit = Math.min(Math.max(options.limit ?? 200, 1), 500);
  let q = supabase
    .from("work_order_measurements")
    .select(
      "id, ref_id, work_order_id, task_id, business_id, recorded_by_user_id, measurement_type, label, width, height, depth, length, quantity, unit, notes, metadata, created_at, updated_at, deleted_at",
    )
    .eq("work_order_id", options.workOrderId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (options.taskId !== undefined) {
    q = options.taskId === null ? q.is("task_id", null) : q.eq("task_id", options.taskId);
  }
  const { data, error } = await q;
  return { data: (data as WorkOrderMeasurementRow[] | null) ?? null, error };
}