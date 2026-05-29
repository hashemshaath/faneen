/**
 * BUSINESS-WORKFLOW-PROCUREMENT-3 — Controlled work-order pipeline hop
 * triggered when a supplier quote is awarded.
 *
 * Uses approved wrappers ONLY:
 *   - `addWorkOrderComment` for the timeline event
 *   - `notifyProcurementEvent` for the in-app notification
 *
 * MUST NOT touch work_order_stages, inventory, or payments. Best-effort.
 */
import { addWorkOrderComment } from '@/modules/workOrders';
import { getProcurementRequestById } from './procurementRequests';
import { getRfqById } from './rfqs';
import { notifyProcurementEvent } from './procurementNotifications';

export interface AwardHandoffInput {
  quote_id: string;
  rfq_id: string;
  actor_user_id?: string | null;
  notify_user_ids?: ReadonlyArray<string>;
}

export async function executeAwardHandoff(
  input: AwardHandoffInput,
): Promise<{ work_order_id: string | null; commented: boolean }> {
  let work_order_id: string | null = null;
  let commented = false;
  try {
    const { data: rfq } = await getRfqById(input.rfq_id);
    if (rfq) {
      const { data: req } = await getProcurementRequestById(rfq.procurement_request_id);
      work_order_id = req?.work_order_id ?? null;
      if (work_order_id && input.actor_user_id) {
        const { error } = await addWorkOrderComment({
          work_order_id,
          business_id: rfq.business_id,
          author_user_id: input.actor_user_id,
          body: `[procurement] Quote ${input.quote_id} awarded on RFQ ${input.rfq_id}.`,
        });
        commented = !error;
      }
    }
  } catch {
    /* best-effort */
  }
  for (const uid of input.notify_user_ids ?? []) {
    notifyProcurementEvent({
      user_id: uid,
      event: 'quote_awarded',
      rfq_id: input.rfq_id,
      quote_id: input.quote_id,
    });
  }
  return { work_order_id, commented };
}