import { supabase } from '@/integrations/supabase/client';
import type {
  ProcurementSupplierQuoteRow,
  ProcurementSupplierQuoteStatus,
} from '../types';
import { updateProcurementRequestStatus } from './procurementRequests';
import { getRfqById } from './rfqs';

const SELECT =
  'id, business_id, rfq_id, supplier_id, status, total_amount, currency, lead_time_days, notes, submitted_at, created_at, updated_at';

export interface SubmitSupplierQuoteInput {
  business_id: string;
  rfq_id: string;
  supplier_id: string;
  total_amount: number;
  currency?: string;
  lead_time_days?: number | null;
  notes?: string | null;
}

export async function submitSupplierQuote(
  input: SubmitSupplierQuoteInput,
): Promise<{ data: ProcurementSupplierQuoteRow | null; error: unknown }> {
  if (!(input.total_amount >= 0)) {
    return { data: null, error: new Error('total_amount_invalid') };
  }
  const { data, error } = await supabase
    .from('procurement_supplier_quotes')
    .upsert(
      {
        business_id: input.business_id,
        rfq_id: input.rfq_id,
        supplier_id: input.supplier_id,
        total_amount: input.total_amount,
        currency: input.currency ?? 'SAR',
        lead_time_days: input.lead_time_days ?? null,
        notes: input.notes ?? null,
        status: 'submitted',
        submitted_at: new Date().toISOString(),
      },
      { onConflict: 'rfq_id,supplier_id' },
    )
    .select(SELECT)
    .maybeSingle();
  return { data: (data as ProcurementSupplierQuoteRow | null) ?? null, error };
}

export async function listSupplierQuotesByRfq(
  rfqId: string,
): Promise<{ data: ProcurementSupplierQuoteRow[] | null; error: unknown }> {
  const { data, error } = await supabase
    .from('procurement_supplier_quotes')
    .select(SELECT)
    .eq('rfq_id', rfqId)
    .order('submitted_at', { ascending: true, nullsFirst: false });
  return { data: (data as ProcurementSupplierQuoteRow[] | null) ?? null, error };
}

export interface AwardSupplierQuoteResult {
  selected: ProcurementSupplierQuoteRow | null;
  error: unknown;
}

/**
 * Selects a supplier quote as the winner. Marks the chosen quote `selected`
 * and all other submitted quotes for the same RFQ `rejected`. Best-effort
 * cascades the parent request to `awarded`.
 */
export async function awardSupplierQuote(
  quoteId: string,
): Promise<AwardSupplierQuoteResult> {
  const { data: quote, error: qErr } = await supabase
    .from('procurement_supplier_quotes')
    .select(SELECT)
    .eq('id', quoteId)
    .maybeSingle();
  if (qErr || !quote) return { selected: null, error: qErr ?? new Error('quote_not_found') };

  const { data: selected, error: selErr } = await supabase
    .from('procurement_supplier_quotes')
    .update({ status: 'selected' satisfies ProcurementSupplierQuoteStatus })
    .eq('id', quoteId)
    .select(SELECT)
    .maybeSingle();
  if (selErr) return { selected: null, error: selErr };

  await supabase
    .from('procurement_supplier_quotes')
    .update({ status: 'rejected' satisfies ProcurementSupplierQuoteStatus })
    .eq('rfq_id', (quote as ProcurementSupplierQuoteRow).rfq_id)
    .eq('status', 'submitted')
    .neq('id', quoteId);

  const { data: rfq } = await getRfqById((quote as ProcurementSupplierQuoteRow).rfq_id);
  if (rfq) {
    await updateProcurementRequestStatus({
      id: rfq.procurement_request_id,
      from: 'quoted',
      to: 'awarded',
    });
  }
  return { selected: (selected as ProcurementSupplierQuoteRow | null) ?? null, error: null };
}