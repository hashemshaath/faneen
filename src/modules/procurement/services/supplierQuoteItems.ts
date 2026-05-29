/**
 * BUSINESS-WORKFLOW-PROCUREMENT-3 — Supplier quote line items.
 * Service-layer only. Pages must import via `@/modules/procurement`.
 */
import { supabase } from '@/integrations/supabase/client';
import type { ProcurementSupplierQuoteItemRow } from '../types';

const SELECT =
  'id, business_id, quote_id, rfq_item_id, unit_price, quantity, total_price, notes, created_at, updated_at';

export interface SubmitQuoteItemInput {
  business_id: string;
  quote_id: string;
  rfq_item_id: string;
  quantity: number;
  unit_price?: number | null;
  notes?: string | null;
}

/** Computes `total_price` from unit_price * quantity when unit_price is given. */
export function calculateLineTotal(
  unit_price: number | null | undefined,
  quantity: number,
): number | null {
  if (typeof unit_price !== 'number' || !Number.isFinite(unit_price)) return null;
  if (typeof quantity !== 'number' || !Number.isFinite(quantity)) return null;
  return Math.round(unit_price * quantity * 100) / 100;
}

function validate(input: Partial<SubmitQuoteItemInput>): string | null {
  if (!(typeof input.quantity === 'number' && input.quantity > 0))
    return 'quantity_invalid';
  if (
    input.unit_price != null &&
    !(typeof input.unit_price === 'number' && input.unit_price >= 0)
  )
    return 'unit_price_invalid';
  return null;
}

export async function submitQuoteItems(
  inputs: ReadonlyArray<SubmitQuoteItemInput>,
): Promise<{ data: ProcurementSupplierQuoteItemRow[] | null; error: unknown }> {
  if (!inputs || inputs.length === 0) return { data: [], error: null };
  for (const i of inputs) {
    const v = validate(i);
    if (v) return { data: null, error: new Error(v) };
  }
  const rows = inputs.map((i) => ({
    business_id: i.business_id,
    quote_id: i.quote_id,
    rfq_item_id: i.rfq_item_id,
    quantity: i.quantity,
    unit_price: i.unit_price ?? null,
    total_price: calculateLineTotal(i.unit_price ?? null, i.quantity),
    notes: i.notes ?? null,
  }));
  const { data, error } = await supabase
    .from('procurement_supplier_quote_items')
    .upsert(rows, { onConflict: 'quote_id,rfq_item_id' })
    .select(SELECT);
  return {
    data: (data as ProcurementSupplierQuoteItemRow[] | null) ?? null,
    error,
  };
}

export async function listQuoteItemsByQuote(
  quoteId: string,
): Promise<{ data: ProcurementSupplierQuoteItemRow[] | null; error: unknown }> {
  const { data, error } = await supabase
    .from('procurement_supplier_quote_items')
    .select(SELECT)
    .eq('quote_id', quoteId)
    .order('created_at', { ascending: true });
  return {
    data: (data as ProcurementSupplierQuoteItemRow[] | null) ?? null,
    error,
  };
}

export async function listQuoteItemsByRfq(
  rfqId: string,
  businessId: string,
): Promise<{ data: ProcurementSupplierQuoteItemRow[] | null; error: unknown }> {
  // RLS scopes by business membership; we still pin business_id explicitly.
  const { data: quotes, error: qErr } = await supabase
    .from('procurement_supplier_quotes')
    .select('id')
    .eq('rfq_id', rfqId)
    .eq('business_id', businessId);
  if (qErr) return { data: null, error: qErr };
  const ids = (quotes ?? []).map((q) => q.id);
  if (ids.length === 0) return { data: [], error: null };
  const { data, error } = await supabase
    .from('procurement_supplier_quote_items')
    .select(SELECT)
    .in('quote_id', ids);
  return {
    data: (data as ProcurementSupplierQuoteItemRow[] | null) ?? null,
    error,
  };
}