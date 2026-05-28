import { supabase } from "@/integrations/supabase/client";
import type { WorkOrderBoqItemRow } from "../types";

export async function listBoqItems(options: {
  boqId: string;
  limit?: number;
}): Promise<{ data: WorkOrderBoqItemRow[] | null; error: unknown }> {
  const limit = Math.min(Math.max(options.limit ?? 500, 1), 1000);
  const { data, error } = await supabase
    .from("work_order_boq_items")
    .select(
      "id, ref_id, boq_id, measurement_id, item_type, title_ar, title_en, quantity, unit, unit_price, total_price, metadata, sort_order, created_at, updated_at, deleted_at",
    )
    .eq("boq_id", options.boqId)
    .is("deleted_at", null)
    .order("sort_order", { ascending: true })
    .limit(limit);
  return { data: (data as WorkOrderBoqItemRow[] | null) ?? null, error };
}