/**
 * WORK ORDER BOQ REVIEW NOTIFICATIONS — PHASE 5
 *
 * In-app notifications for the BOQ review FSM. Mirrors the contract
 * notification pattern: uses the central `createNotification` helper, never
 * notifies the actor, only notifies users that are actually linked to the
 * parent contract (`provider_id` = الطرف الأول, `client_id` = الطرف الثاني).
 *
 * Hard constraints:
 *  - No privileged keys, no edge function, no email SDK — in-app only.
 *  - No billing / payment / warranty / handover surfaces.
 *  - Does not change the WO or contract lifecycle. Read-only against
 *    `work_orders` + `contracts` for party resolution; writes only to
 *    `notifications` via the shared wrapper.
 */
import { supabase } from "@/integrations/supabase/client";
import {
  createNotification,
  type CreateNotificationPayload,
} from "@/modules/notifications/services/createNotification";

export type WorkOrderBoqReviewNotificationEvent =
  | "boq_review_submitted"
  | "boq_review_resubmitted"
  | "boq_review_changes_requested"
  | "boq_review_accepted";

export interface WorkOrderBoqReviewNotificationContext {
  work_order_id: string;
  work_order_ref_id?: string | null;
  boq_id: string;
  boq_ref_id?: string | null;
  /** الطرف الأول — provider business owner. */
  provider_user_id?: string | null;
  /** الطرف الثاني — client. */
  client_user_id?: string | null;
  actor_user_id?: string | null;
}

interface EventCopy {
  title_ar: string;
  title_en: string;
}

function buildCopy(
  event: WorkOrderBoqReviewNotificationEvent,
  ref: string,
): EventCopy {
  switch (event) {
    case "boq_review_submitted":
      return {
        title_ar: `تم إرسال BOQ للمراجعة — ${ref}`,
        title_en: `BOQ sent for review — ${ref}`,
      };
    case "boq_review_resubmitted":
      return {
        title_ar: `تمت إعادة إرسال BOQ للمراجعة — ${ref}`,
        title_en: `BOQ resubmitted for review — ${ref}`,
      };
    case "boq_review_changes_requested":
      return {
        title_ar: `طلب الطرف الثاني تعديل BOQ — ${ref}`,
        title_en: `Second party requested BOQ changes — ${ref}`,
      };
    case "boq_review_accepted":
      return {
        title_ar: `قبل الطرف الثاني مراجعة BOQ — ${ref}`,
        title_en: `Second party accepted the BOQ review — ${ref}`,
      };
  }
}

/**
 * Resolve the recipient (provider or client) for a given event.
 * Pure — exported for tests.
 *
 * - `boq_review_submitted` / `boq_review_resubmitted` → notify the client.
 * - `boq_review_changes_requested` / `boq_review_accepted` → notify the provider.
 * The actor is always excluded.
 */
export function resolveWorkOrderBoqReviewRecipients(
  ctx: WorkOrderBoqReviewNotificationContext,
  event: WorkOrderBoqReviewNotificationEvent,
): string[] {
  const targets: Array<string | null | undefined> =
    event === "boq_review_submitted" || event === "boq_review_resubmitted"
      ? [ctx.client_user_id]
      : [ctx.provider_user_id];

  const cleaned = targets.filter(
    (v): v is string => typeof v === "string" && v.length > 0,
  );
  const unique = Array.from(new Set(cleaned));
  return ctx.actor_user_id
    ? unique.filter((id) => id !== ctx.actor_user_id)
    : unique;
}

/**
 * Resolves the parent contract parties for a work order. Returns nulls when
 * the work order has no contract source — no notifications are sent in that
 * case. Read-only.
 */
export async function resolveWorkOrderContractParties(
  workOrderId: string,
): Promise<{
  work_order_ref_id: string | null;
  provider_user_id: string | null;
  client_user_id: string | null;
}> {
  const wo = await supabase
    .from("work_orders")
    .select("ref_id, source_type, source_id")
    .eq("id", workOrderId)
    .is("deleted_at", null)
    .maybeSingle();

  const row = wo.data as {
    ref_id: string | null;
    source_type: string | null;
    source_id: string | null;
  } | null;
  if (!row || row.source_type !== "contract" || !row.source_id) {
    return {
      work_order_ref_id: row?.ref_id ?? null,
      provider_user_id: null,
      client_user_id: null,
    };
  }

  const contract = await supabase
    .from("contracts")
    .select("provider_id, client_id")
    .eq("id", row.source_id)
    .maybeSingle();

  const c = contract.data as {
    provider_id: string | null;
    client_id: string | null;
  } | null;
  return {
    work_order_ref_id: row.ref_id ?? null,
    provider_user_id: c?.provider_id ?? null,
    client_user_id: c?.client_id ?? null,
  };
}

export async function notifyWorkOrderBoqReview(args: {
  event: WorkOrderBoqReviewNotificationEvent;
  context: WorkOrderBoqReviewNotificationContext;
}): Promise<{ recipients: string[]; errors: unknown[] }> {
  const { event, context } = args;
  const recipients = resolveWorkOrderBoqReviewRecipients(context, event);
  if (recipients.length === 0) return { recipients: [], errors: [] };

  const ref =
    context.work_order_ref_id ||
    context.boq_ref_id ||
    context.work_order_id;
  const copy = buildCopy(event, ref);
  const actionUrl = `/dashboard/work-orders/${
    context.work_order_ref_id ?? context.work_order_id
  }`;

  const errors: unknown[] = [];
  await Promise.all(
    recipients.map(async (userId) => {
      const payload: CreateNotificationPayload = {
        user_id: userId,
        title_ar: copy.title_ar,
        title_en: copy.title_en,
        notification_type: "work_order",
        reference_type: "work_order_boq",
        reference_id: context.boq_id,
        action_url: actionUrl,
      };
      try {
        const res = await createNotification(payload);
        const err = (res as { error?: unknown } | null | undefined)?.error;
        if (err) errors.push(err);
      } catch (err) {
        errors.push(err);
      }
    }),
  );

  return { recipients, errors };
}