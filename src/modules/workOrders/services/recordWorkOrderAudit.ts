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
    | "work_order.comment_added"
    | "work_order.created_from_contract"
    | "work_order.created_from_quote"
    | "work_order.created_from_lead"
    | "work_order.created_from_booking"
    | "work_order.attachment_added"
    | "work_order.attachment_deleted"
    | "work_order.measurement_added"
    | "work_order.measurement_updated"
    | "work_order.measurement_deleted"
    | "work_order.boq_generated"
    | "work_order.boq_item_updated"
    | "work_order.boq_finalized"
    | "work_order.quotation_created"
    | "work_order.quotation_sent"
    | "work_order.quotation_approved"
    | "work_order.quotation_approved_with_signature"
    | "work_order.quotation_rejected"
    | "work_order.quotation_converted_to_contract_draft"
    | "work_order.stage_changed"
    | "work_order.checklist_created"
    | "work_order.checklist_completed"
    | "work_order.checklist_item_updated"
    | "work_order.operator_assigned";
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
    const payload: Record<string, unknown> = {
      business_id: input.business_id,
      actor_id: input.actor_id,
      entity_type: "work_order",
      entity_id: input.entity_id,
      action: input.action,
      metadata: input.metadata ?? {},
    };
    // Supabase typed-overload variance — cast at the boundary only.
    await supabase
      .from("business_audit_log")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .insert(payload as any);
  } catch {
    /* swallow — observability only */
  }
}