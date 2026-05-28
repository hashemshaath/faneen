/**
 * BUSINESS-WORKFLOW-5D — List frozen quotation items.
 */
import { supabase } from "@/integrations/supabase/client";
import type { WorkOrderQuotationItemRow } from "../types";

export async function listQuotationItems(input: {
  quotationId: string;
}): Promise<{ data: WorkOrderQuotationItemRow[] | null; error: unknown }> {
  const { data, error } = await supabase
    .from("work_order_quotation_items")
    .select(
      "id, ref_id, quotation_id, boq_item_id, item_type, title_ar, title_en, quantity, unit, unit_price, total_price, metadata, sort_order, created_at, updated_at, deleted_at",
    )
    .eq("quotation_id", input.quotationId)
    .is("deleted_at", null)
    .order("sort_order", { ascending: true });
  return { data: (data as WorkOrderQuotationItemRow[] | null) ?? null, error };
}