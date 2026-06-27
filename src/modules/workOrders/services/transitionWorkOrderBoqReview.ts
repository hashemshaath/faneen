/**
 * WORK ORDER BOQ REVIEW STATUS — PHASE 4
 *
 * Centralized, FSM-guarded transitions for `work_order_boqs.review_status`.
 * Components MUST call these helpers — direct `from('work_order_boqs').update`
 * from a component is forbidden.
 *
 * Hard scope (see Phase 4 brief for the full ban list):
 *   - Review-only surface, no billing-adjacent calls.
 *   - No contract or WO lifecycle mutation.
 *   - No privileged keys / direct table writes outside this service.
 *   - No RLS changes.
 */
import { supabase } from "@/integrations/supabase/client";
import {
  recordWorkOrderAudit,
  type RecordWorkOrderAuditInput,
} from "./recordWorkOrderAudit";
import {
  notifyWorkOrderBoqReview,
  resolveWorkOrderContractParties,
  type WorkOrderBoqReviewNotificationEvent,
} from "./notifications/notifyWorkOrderBoqReview";
import {
  isAllowedBoqReviewTransition,
  type WorkOrderBoqReviewStatus,
  type WorkOrderBoqRow,
} from "../types";

const SELECT_COLS =
  "id, ref_id, work_order_id, business_id, title, status, review_status, notes, subtotal, tax, total, created_by, finalized_at, finalized_by, created_at, updated_at, deleted_at";

type ReviewError =
  | { code: "not_found" }
  | { code: "invalid_transition"; from: WorkOrderBoqReviewStatus; to: WorkOrderBoqReviewStatus }
  | { code: "db_error"; cause: unknown };

export interface TransitionWorkOrderBoqReviewResult {
  data: WorkOrderBoqRow | null;
  error: ReviewError | null;
}

async function transition(input: {
  boq_id: string;
  actor_id: string;
  to: WorkOrderBoqReviewStatus;
  audit_action: RecordWorkOrderAuditInput["action"];
  notification_event: WorkOrderBoqReviewNotificationEvent;
}): Promise<TransitionWorkOrderBoqReviewResult> {
  const current = await supabase
    .from("work_order_boqs")
    .select(SELECT_COLS)
    .eq("id", input.boq_id)
    .is("deleted_at", null)
    .maybeSingle();

  if (current.error) {
    return { data: null, error: { code: "db_error", cause: current.error } };
  }
  const row = current.data as WorkOrderBoqRow | null;
  if (!row) return { data: null, error: { code: "not_found" } };

  const from = row.review_status;
  if (!isAllowedBoqReviewTransition(from, input.to)) {
    return {
      data: null,
      error: { code: "invalid_transition", from, to: input.to },
    };
  }

  const { data, error } = await supabase
    .from("work_order_boqs")
    .update({ review_status: input.to })
    .eq("id", input.boq_id)
    .eq("review_status", from)
    .is("deleted_at", null)
    .select(SELECT_COLS)
    .maybeSingle();

  if (error) return { data: null, error: { code: "db_error", cause: error } };
  if (!data) return { data: null, error: { code: "not_found" } };

  const next = data as WorkOrderBoqRow;
  await recordWorkOrderAudit({
    business_id: next.business_id,
    actor_id: input.actor_id,
    entity_id: next.work_order_id,
    action: input.audit_action,
    metadata: {
      boq_id: next.id,
      ref_id: next.ref_id,
      from_review_status: from,
      to_review_status: next.review_status,
    },
  });

  try {
    const parties = await resolveWorkOrderContractParties(next.work_order_id);
    await notifyWorkOrderBoqReview({
      event: input.notification_event,
      context: {
        work_order_id: next.work_order_id,
        work_order_ref_id: parties.work_order_ref_id,
        boq_id: next.id,
        boq_ref_id: next.ref_id,
        provider_user_id: parties.provider_user_id,
        client_user_id: parties.client_user_id,
        actor_user_id: input.actor_id,
      },
    });
  } catch {
    /* notifications are best-effort — must never block the transition */
  }

  return { data: next, error: null };
}

export function submitWorkOrderBoqForReview(input: {
  boq_id: string;
  actor_id: string;
}): Promise<TransitionWorkOrderBoqReviewResult> {
  return transition({
    boq_id: input.boq_id,
    actor_id: input.actor_id,
    to: "submitted",
    audit_action: "work_order.boq_review_submitted",
    notification_event: "boq_review_submitted",
  });
}

export function requestWorkOrderBoqChanges(input: {
  boq_id: string;
  actor_id: string;
}): Promise<TransitionWorkOrderBoqReviewResult> {
  return transition({
    boq_id: input.boq_id,
    actor_id: input.actor_id,
    to: "needs_changes",
    audit_action: "work_order.boq_review_changes_requested",
    notification_event: "boq_review_changes_requested",
  });
}

export function acceptWorkOrderBoqReview(input: {
  boq_id: string;
  actor_id: string;
}): Promise<TransitionWorkOrderBoqReviewResult> {
  return transition({
    boq_id: input.boq_id,
    actor_id: input.actor_id,
    to: "accepted",
    audit_action: "work_order.boq_review_accepted",
    notification_event: "boq_review_accepted",
  });
}