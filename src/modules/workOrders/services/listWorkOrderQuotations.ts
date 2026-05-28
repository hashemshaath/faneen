/**
 * BUSINESS-WORKFLOW-5D — List quotations for a work order.
 */
import { supabase } from "@/integrations/supabase/client";
import type { WorkOrderQuotationRow } from "../types";

export async function listWorkOrderQuotations(input: {
  workOrderId: string;
}): Promise<{ data: WorkOrderQuotationRow[] | null; error: unknown }> {
  const { data, error } = await supabase
    .from("work_order_quotations")
    .select(
      "id, ref_id, work_order_id, boq_id, business_id, status, quotation_number, title, notes, subtotal, tax, total, currency, valid_until, sent_at, viewed_at, approved_at, rejected_at, rejection_reason, approval_token_hash, pdf_attachment_id, created_by, created_at, updated_at, deleted_at",
    )
    .eq("work_order_id", input.workOrderId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  return { data: (data as WorkOrderQuotationRow[] | null) ?? null, error };
}