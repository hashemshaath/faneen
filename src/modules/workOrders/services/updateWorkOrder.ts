import { supabase } from "@/integrations/supabase/client";
import type { WorkOrderRow, WorkOrderStatus, WorkOrderPriority } from "../types";
import { recordWorkOrderAudit } from "./recordWorkOrderAudit";

export interface UpdateWorkOrderInput {
  id: string;
  actor_id: string;
  title?: string;
  status?: WorkOrderStatus;
  priority?: WorkOrderPriority;
  current_stage_key?: string | null;
  due_at?: string | null;
  customer_name?: string | null;
  customer_phone?: string | null;
}

export async function updateWorkOrder(
  input: UpdateWorkOrderInput,
): Promise<{ data: WorkOrderRow | null; error: unknown }> {
  const patch: Record<string, unknown> = {};
  if (input.title !== undefined) patch.title = input.title.trim();
  if (input.status !== undefined) {
    patch.status = input.status;
    if (input.status === "completed") patch.completed_at = new Date().toISOString();
  }
  if (input.priority !== undefined) patch.priority = input.priority;
  if (input.current_stage_key !== undefined) patch.current_stage_key = input.current_stage_key;
  if (input.due_at !== undefined) patch.due_at = input.due_at;
  if (input.customer_name !== undefined) patch.customer_name = input.customer_name;
  if (input.customer_phone !== undefined) patch.customer_phone = input.customer_phone;

  const { data, error } = await supabase
    .from("work_orders")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .update(patch as any)
    .eq("id", input.id)
    .select(
      "id, ref_id, business_id, source_type, source_id, title, customer_name, customer_phone, status, current_stage_key, priority, owner_user_id, created_by_user_id, due_at, completed_at, created_at, updated_at, deleted_at",
    )
    .maybeSingle();

  if (!error && data) {
    await recordWorkOrderAudit({
      business_id: data.business_id,
      actor_id: input.actor_id,
      entity_id: data.id,
      action: "work_order.updated",
      metadata: { changed: Object.keys(patch) },
    });
  }

  return { data: (data as WorkOrderRow | null) ?? null, error };
}