import { supabase } from "@/integrations/supabase/client";
import type { WorkOrderStageRow } from "../types";

export async function listWorkOrderStages(options: {
  workOrderId: string;
}): Promise<{ data: WorkOrderStageRow[] | null; error: unknown }> {
  const { data, error } = await supabase
    .from("work_order_stages")
    .select(
      "id, work_order_id, stage_key, title_ar, title_en, status, sort_order, started_at, completed_at, assigned_to_user_id, created_at, updated_at",
    )
    .eq("work_order_id", options.workOrderId)
    .order("sort_order", { ascending: true });
  return { data: (data as WorkOrderStageRow[] | null) ?? null, error };
}