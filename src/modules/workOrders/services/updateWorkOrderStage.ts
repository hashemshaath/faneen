import { supabase } from "@/integrations/supabase/client";
import type { WorkOrderStageRow, WorkOrderStageStatus } from "../types";
import { recordWorkOrderAudit } from "./recordWorkOrderAudit";

export interface UpdateWorkOrderStageInput {
  stageId: string;
  actor_id: string;
  patch: {
    status?: WorkOrderStageStatus;
    assigned_to_user_id?: string | null;
    started_at?: string | null;
    completed_at?: string | null;
  };
}

export async function updateWorkOrderStage(
  input: UpdateWorkOrderStageInput,
): Promise<{ data: WorkOrderStageRow | null; error: unknown }> {
  const patch: Record<string, unknown> = { ...input.patch };
  if (input.patch.status === "active" && input.patch.started_at === undefined) {
    patch.started_at = new Date().toISOString();
  }
  if (input.patch.status === "completed" && input.patch.completed_at === undefined) {
    patch.completed_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from("work_order_stages")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .update(patch as any)
    .eq("id", input.stageId)
    .select(
      "id, work_order_id, stage_key, title_ar, title_en, status, sort_order, started_at, completed_at, assigned_to_user_id, created_at, updated_at",
    )
    .maybeSingle();

  if (!error && data) {
    await recordWorkOrderAudit({
      business_id: "",
      actor_id: input.actor_id,
      entity_id: data.work_order_id,
      action: "work_order.stage_updated",
      metadata: { stage_key: data.stage_key, status: data.status },
    });
  }

  return { data: (data as WorkOrderStageRow | null) ?? null, error };
}