import { supabase } from "@/integrations/supabase/client";
import type { WorkOrderPipelineEventRow } from "../types";

export async function listWorkOrderPipelineEvents(options: {
  workOrderId: string;
  limit?: number;
}): Promise<{ data: WorkOrderPipelineEventRow[] | null; error: unknown }> {
  const { data, error } = await supabase
    .from("work_order_pipeline_events")
    .select(
      "id, ref_id, work_order_id, business_id, from_stage, to_stage, actor_id, notes, created_at",
    )
    .eq("work_order_id", options.workOrderId)
    .order("created_at", { ascending: true })
    .limit(options.limit ?? 200);
  return {
    data: (data as WorkOrderPipelineEventRow[] | null) ?? null,
    error,
  };
}