import { supabase } from "@/integrations/supabase/client";
import type { WorkOrderTaskRow, WorkOrderPriority } from "../types";
import { recordWorkOrderAudit } from "./recordWorkOrderAudit";

export interface CreateWorkOrderTaskInput {
  work_order_id: string;
  business_id: string;
  created_by_user_id: string;
  title: string;
  description?: string | null;
  priority?: WorkOrderPriority;
  stage_id?: string | null;
  assigned_to_user_id?: string | null;
  due_at?: string | null;
}

export async function createWorkOrderTask(
  input: CreateWorkOrderTaskInput,
): Promise<{ data: WorkOrderTaskRow | null; error: unknown }> {
  const title = (input.title ?? "").trim();
  if (title.length === 0) return { data: null, error: new Error("title_required") };
  if (title.length > 200) return { data: null, error: new Error("title_too_long") };

  const payload = {
    work_order_id: input.work_order_id,
    business_id: input.business_id,
    created_by_user_id: input.created_by_user_id,
    title,
    description: input.description ?? null,
    priority: input.priority ?? "medium",
    stage_id: input.stage_id ?? null,
    assigned_to_user_id: input.assigned_to_user_id ?? null,
    due_at: input.due_at ?? null,
    status: "todo",
  };

  const { data, error } = await supabase
    .from("work_order_tasks")
    .insert(payload)
    .select(
      "id, ref_id, work_order_id, stage_id, business_id, title, description, status, priority, assigned_to_user_id, created_by_user_id, due_at, completed_at, created_at, updated_at, deleted_at",
    )
    .maybeSingle();

  if (!error && data) {
    await recordWorkOrderAudit({
      business_id: data.business_id,
      actor_id: input.created_by_user_id,
      entity_id: data.work_order_id,
      action: "work_order.task_created",
      metadata: { task_id: data.id, ref_id: data.ref_id, title: data.title },
    });
  }

  return { data: (data as WorkOrderTaskRow | null) ?? null, error };
}