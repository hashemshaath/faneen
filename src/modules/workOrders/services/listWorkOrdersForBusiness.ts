import { supabase } from "@/integrations/supabase/client";
import type { WorkOrderRow, WorkOrderStatus } from "../types";

export interface ListWorkOrdersOptions {
  businessId: string;
  status?: WorkOrderStatus | "all";
  limit?: number;
}

export async function listWorkOrdersForBusiness(
  options: ListWorkOrdersOptions,
): Promise<{ data: WorkOrderRow[] | null; error: unknown }> {
  const limit = Math.min(Math.max(options.limit ?? 50, 1), 200);
  let q = supabase
    .from("work_orders")
    .select(
      "id, ref_id, business_id, source_type, source_id, title, customer_name, customer_phone, status, current_stage_key, priority, owner_user_id, created_by_user_id, due_at, completed_at, created_at, updated_at, deleted_at",
    )
    .eq("business_id", options.businessId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (options.status && options.status !== "all") {
    q = q.eq("status", options.status);
  }

  const { data, error } = await q;
  return { data: (data as WorkOrderRow[] | null) ?? null, error };
}