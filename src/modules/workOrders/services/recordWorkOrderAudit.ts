import { supabase } from "@/integrations/supabase/client";

export interface RecordWorkOrderAuditInput {
  business_id: string;
  actor_id: string;
  entity_id: string;
  action:
    | "work_order.created"
    | "work_order.updated"
    | "work_order.stage_updated"
    | "work_order.task_created"
    | "work_order.task_completed"
    | "work_order.comment_added";
  metadata?: Record<string, unknown>;
}

/**
 * Best-effort write to business_audit_log for the work-order timeline.
 * Never throws — audit failures must not block primary operations.
 */
export async function recordWorkOrderAudit(
  input: RecordWorkOrderAuditInput,
): Promise<void> {
  try {
    await supabase.from("business_audit_log").insert({
      business_id: input.business_id,
      actor_id: input.actor_id,
      entity_type: "work_order",
      entity_id: input.entity_id,
      action: input.action,
      metadata: input.metadata ?? {},
    });
  } catch {
    /* swallow — observability only */
  }
}