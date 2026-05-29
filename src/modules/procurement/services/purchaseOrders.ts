/**
 * PROCUREMENT-RFQ-ENGINE-1 — Purchase Order drafts.
 *
 * PO drafts are an after-award artefact ONLY. They never trigger payments,
 * goods receipt, inventory movement, or external notifications. Pages MUST
 * import from `@/modules/procurement`.
 */
import { supabase } from '@/integrations/supabase/client';
import type {
  ProcurementPurchaseOrderRow,
  ProcurementPurchaseOrderStatus,
} from '../types';

const SELECT =
  'id, business_id, rfq_id, supplier_quote_id, supplier_id, supplier_name, po_number, status, subtotal, tax, total, currency, created_by, created_at, updated_at';

export interface CreatePurchaseOrderDraftInput {
  business_id: string;
  rfq_id: string;
  supplier_quote_id: string;
  supplier_id: string;
  supplier_name: string;
  created_by: string;
  subtotal: number;
  tax?: number;
  total: number;
  currency?: string;
}

/**
 * Idempotent on `supplier_quote_id` (unique). If a draft already exists for
 * the awarded quote, it is returned as-is.
 */
export async function createPurchaseOrderDraft(
  input: CreatePurchaseOrderDraftInput,
): Promise<{ data: ProcurementPurchaseOrderRow | null; error: unknown }> {
  if (!(input.subtotal >= 0) || !(input.total >= 0)) {
    return { data: null, error: new Error('amount_invalid') };
  }
  // Short-circuit if a draft is already present for this awarded quote.
  const existing = await getPurchaseOrderByQuote(input.supplier_quote_id);
  if (existing.data) return existing;

  const { data, error } = await supabase
    .from('procurement_purchase_orders')
    .insert({
      business_id: input.business_id,
      rfq_id: input.rfq_id,
      supplier_quote_id: input.supplier_quote_id,
      supplier_id: input.supplier_id,
      supplier_name: input.supplier_name,
      created_by: input.created_by,
      subtotal: input.subtotal,
      tax: input.tax ?? 0,
      total: input.total,
      currency: input.currency ?? 'SAR',
      status: 'draft' satisfies ProcurementPurchaseOrderStatus,
    })
    .select(SELECT)
    .maybeSingle();
  return { data: (data as ProcurementPurchaseOrderRow | null) ?? null, error };
}

export async function getPurchaseOrderByQuote(
  supplierQuoteId: string,
): Promise<{ data: ProcurementPurchaseOrderRow | null; error: unknown }> {
  const { data, error } = await supabase
    .from('procurement_purchase_orders')
    .select(SELECT)
    .eq('supplier_quote_id', supplierQuoteId)
    .maybeSingle();
  return { data: (data as ProcurementPurchaseOrderRow | null) ?? null, error };
}

export async function listPurchaseOrdersByRfq(
  rfqId: string,
): Promise<{ data: ProcurementPurchaseOrderRow[] | null; error: unknown }> {
  const { data, error } = await supabase
    .from('procurement_purchase_orders')
    .select(SELECT)
    .eq('rfq_id', rfqId)
    .order('created_at', { ascending: false });
  return { data: (data as ProcurementPurchaseOrderRow[] | null) ?? null, error };
}