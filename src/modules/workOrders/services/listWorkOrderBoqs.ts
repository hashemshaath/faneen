import { supabase } from "@/integrations/supabase/client";
import type { WorkOrderBoqRow } from "../types";

export async function listWorkOrderBoqs(options: {
  workOrderId: string;
  limit?: number;
}): Promise<{ data: WorkOrderBoqRow[] | null; error: unknown }> {
  const limit = Math.min(Math.max(options.limit ?? 50, 1), 200);
  const { data, error } = await supabase
    .from("work_order_boqs")
    .select(
      "id, ref_id, work_order_id, business_id, title, status, notes, subtotal, tax, total, created_by, finalized_at, finalized_by, created_at, updated_at, deleted_at",
    )
    .eq("work_order_id", options.workOrderId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);
  return { data: (data as WorkOrderBoqRow[] | null) ?? null, error };
}