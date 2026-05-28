import { supabase } from "@/integrations/supabase/client";
import type { WorkOrderRow } from "../types";

export async function getWorkOrderById(
  id: string,
): Promise<{ data: WorkOrderRow | null; error: unknown }> {
  const { data, error } = await supabase
    .from("work_orders")
    .select(
      "id, ref_id, business_id, source_type, source_id, source_ref_id, title, customer_name, customer_phone, status, current_stage_key, priority, owner_user_id, created_by_user_id, due_at, completed_at, created_at, updated_at, deleted_at",
    )
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  return { data: (data as WorkOrderRow | null) ?? null, error };
}