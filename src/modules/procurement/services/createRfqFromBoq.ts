/**
 * PROCUREMENT-RFQ-ENGINE-1 — Create an RFQ from a finalized BOQ.
 *
 * - Reads BOQ items via the existing work-order wrapper (`listBoqItems`).
 * - Creates (or reuses, by `source_boq_id`) a parent procurement_request,
 *   the RFQ header, and one RFQ line per BOQ item.
 * - DOES NOT copy BOQ unit_price as a supplier price; only `target_price`
 *   is seeded for the buyer's internal reference.
 * - DOES NOT mutate the BOQ.
 * - Idempotent: re-invoking for the same BOQ returns the existing RFQ.
 * - Records audit event `procurement.rfq_created_from_boq` (best-effort).
 */
import { supabase } from '@/integrations/supabase/client';
import { listBoqItems } from '@/modules/workOrders';
import { recordWorkOrderAudit } from '@/modules/workOrders';
import type { ProcurementRfqRow } from '../types';
import { createRfqItem } from './rfqItems';

export interface CreateRfqFromBoqInput {
  boq_id: string;
  work_order_id: string;
  business_id: string;
  created_by: string;
  title?: string;
}

export interface CreateRfqFromBoqResult {
  rfq: ProcurementRfqRow | null;
  created: boolean;
  itemCount: number;
  error: unknown;
}

const RFQ_SELECT =
  'id, business_id, procurement_request_id, rfq_number, status, due_at, expires_at, sent_at, closed_at, awarded_quote_id, created_by, created_at, updated_at';

export async function createProcurementRfqFromBoq(
  input: CreateRfqFromBoqInput,
): Promise<CreateRfqFromBoqResult> {
  // 1. Idempotency check — is there already an RFQ for this BOQ?
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (supabase
    .from('procurement_rfqs') as any)
    .select(RFQ_SELECT)
    .eq('source_boq_id', input.boq_id)
    .maybeSingle();
  if (existing) {
    return {
      rfq: existing as ProcurementRfqRow,
      created: false,
      itemCount: 0,
      error: null,
    };
  }

  // 2. Snapshot BOQ items.
  const { data: boqItems, error: itemsErr } = await listBoqItems({
    boqId: input.boq_id,
    limit: 1000,
  });
  if (itemsErr) return { rfq: null, created: false, itemCount: 0, error: itemsErr };
  if (!boqItems || boqItems.length === 0) {
    return { rfq: null, created: false, itemCount: 0, error: new Error('boq_empty') };
  }

  // 3. Create a parent procurement_request (RFQs always need one).
  const reqTitle =
    input.title?.trim() || `BOQ ${input.boq_id.slice(0, 8)} — RFQ`;
  const { data: req, error: reqErr } = await supabase
    .from('procurement_requests')
    .insert({
      business_id: input.business_id,
      work_order_id: input.work_order_id,
      created_by: input.created_by,
      title: reqTitle,
      status: 'requested',
    })
    .select('id, business_id, work_order_id')
    .maybeSingle();
  if (reqErr || !req) return { rfq: null, created: false, itemCount: 0, error: reqErr ?? new Error('request_failed') };

  // 4. Create RFQ header with source_boq_id back-link.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rfq, error: rfqErr } = await (supabase
    .from('procurement_rfqs') as any)
    .insert({
      business_id: input.business_id,
      procurement_request_id: req.id,
      created_by: input.created_by,
      status: 'draft',
      source_boq_id: input.boq_id,
    })
    .select(RFQ_SELECT)
    .maybeSingle();
  if (rfqErr || !rfq) {
    return { rfq: null, created: false, itemCount: 0, error: rfqErr ?? new Error('rfq_failed') };
  }

  // 5. Copy BOQ items → RFQ items (no supplier pricing, target_price only).
  let copied = 0;
  for (const it of boqItems) {
    const name = (it.title_en?.trim() || it.title_ar?.trim() || 'item').slice(0, 200);
    const { error: liErr } = await createRfqItem({
      business_id: input.business_id,
      rfq_id: (rfq as ProcurementRfqRow).id,
      name,
      description: it.title_ar !== it.title_en ? it.title_ar : null,
      quantity: Number(it.quantity) > 0 ? Number(it.quantity) : 1,
      unit: it.unit ?? null,
      target_price: Number.isFinite(it.unit_price) && it.unit_price > 0 ? Number(it.unit_price) : null,
      sort_order: it.sort_order ?? copied,
      // RFQ-BRAND-PICKER-1D — copy approved brand requirement from the BOQ
      // line. Approved-brand validation trigger on procurement_rfq_items
      // will block insert if the brand became invalid post-BOQ.
      requested_brand_id: it.brand_id ?? null,
      brand_lock: it.brand_id ? (it.brand_lock ?? null) : null,
    });
    if (!liErr) copied++;
  }

  // 6. Best-effort audit (does not affect return).
  try {
    await recordWorkOrderAudit({
      business_id: input.business_id,
      actor_id: input.created_by,
      entity_id: input.work_order_id,
      action: 'procurement.rfq_created_from_boq',
      metadata: {
        rfq_id: (rfq as ProcurementRfqRow).id,
        rfq_number: (rfq as ProcurementRfqRow).rfq_number,
        boq_id: input.boq_id,
        item_count: copied,
      },
    });
  } catch {
    /* swallow */
  }

  return {
    rfq: rfq as ProcurementRfqRow,
    created: true,
    itemCount: copied,
    error: null,
  };
}