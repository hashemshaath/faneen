import { supabase } from "@/integrations/supabase/client";
import type { WorkOrderTaskRow, WorkOrderTaskStatus, WorkOrderPriority } from "../types";
import { recordWorkOrderAudit } from "./recordWorkOrderAudit";

export interface UpdateWorkOrderTaskInput {
  taskId: string;
  actor_id: string;
  patch: {
    title?: string;
    description?: string | null;
    status?: WorkOrderTaskStatus;
    priority?: WorkOrderPriority;
    assigned_to_user_id?: string | null;
    due_at?: string | null;
  };
}

export async function updateWorkOrderTask(
  input: UpdateWorkOrderTaskInput,
): Promise<{ data: WorkOrderTaskRow | null; error: unknown }> {
  const patch: Record<string, unknown> = { ...input.patch };
  if (input.patch.status === "completed") {
    patch.completed_at = new Date().toISOString();
  }
  if (input.patch.title !== undefined) patch.title = input.patch.title.trim();

  const { data, error } = await supabase
    .from("work_order_tasks")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .update(patch as any)
    .eq("id", input.taskId)
    .select(
      "id, ref_id, work_order_id, stage_id, business_id, title, description, status, priority, assigned_to_user_id, created_by_user_id, due_at, completed_at, created_at, updated_at, deleted_at",
    )
    .maybeSingle();

  if (!error && data) {
    const action =
      input.patch.status === "completed"
        ? "work_order.task_completed"
        : "work_order.task_created"; // placeholder; we narrow below
    if (input.patch.status === "completed") {
      await recordWorkOrderAudit({
        business_id: data.business_id,
        actor_id: input.actor_id,
        entity_id: data.work_order_id,
        action: "work_order.task_completed",
        metadata: { task_id: data.id, ref_id: data.ref_id },
      });
    }
    void action;
  }

  return { data: (data as WorkOrderTaskRow | null) ?? null, error };
}