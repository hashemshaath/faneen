/**
 * WORK ORDER BOQ REVIEW TIMELINE — PHASE 5
 *
 * Read-only timeline of BOQ review events for a single work order.
 * Uses the existing `business_audit_log` (no new table). RLS-scoped to
 * business staff via the existing audit policy — no privileged keys, no
 * service_role, no edge function. Clients without audit visibility get
 * an empty list (this is correct; the review panel still surfaces the
 * current status to them).
 */
import { supabase } from "@/integrations/supabase/client";

export type WorkOrderBoqReviewAuditAction =
  | "work_order.boq_review_submitted"
  | "work_order.boq_review_changes_requested"
  | "work_order.boq_review_accepted";

export const WORK_ORDER_BOQ_REVIEW_AUDIT_ACTIONS: ReadonlyArray<WorkOrderBoqReviewAuditAction> =
  [
    "work_order.boq_review_submitted",
    "work_order.boq_review_changes_requested",
    "work_order.boq_review_accepted",
  ];

export interface WorkOrderBoqReviewTimelineEvent {
  id: string;
  business_id: string | null;
  actor_id: string | null;
  entity_type: string;
  entity_id: string | null;
  action: WorkOrderBoqReviewAuditAction;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export async function listWorkOrderBoqReviewTimeline(options: {
  workOrderId: string;
  limit?: number;
}): Promise<{
  data: WorkOrderBoqReviewTimelineEvent[] | null;
  error: unknown;
}> {
  const limit = Math.min(Math.max(options.limit ?? 50, 1), 200);
  const { data, error } = await supabase
    .from("business_audit_log")
    .select(
      "id, business_id, actor_id, entity_type, entity_id, action, metadata, created_at",
    )
    .eq("entity_type", "work_order")
    .eq("entity_id", options.workOrderId)
    .in("action", WORK_ORDER_BOQ_REVIEW_AUDIT_ACTIONS as unknown as string[])
    .order("created_at", { ascending: false })
    .limit(limit);
  return {
    data: (data as WorkOrderBoqReviewTimelineEvent[] | null) ?? null,
    error,
  };
}