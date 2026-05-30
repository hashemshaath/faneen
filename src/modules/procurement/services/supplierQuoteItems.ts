/**
 * BUSINESS-WORKFLOW-PROCUREMENT-3 — Supplier quote line items.
 * Service-layer only. Pages must import via `@/modules/procurement`.
 */
import { supabase } from '@/integrations/supabase/client';
import type {
  ProcurementSupplierQuoteItemRow,
  BrandMatchStatus,
  BrandReviewStatus,
} from '../types';

const SELECT =
  'id, business_id, quote_id, rfq_item_id, unit_price, quantity, total_price, notes, ' +
  'proposed_brand_id, proposed_brand_name, brand_match_status, brand_review_status, ' +
  'brand_reviewed_by, brand_reviewed_at, brand_review_note, created_at, updated_at';

const PROPOSED_BRAND_NAME_MAX = 120;
const REVIEW_NOTE_MAX = 1000;

/** RFQ-BRAND-PICKER-1E — sanitize free-text proposed brand input. */
export function sanitizeProposedBrandName(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  // Strip control chars + collapse whitespace.
  const cleaned = raw
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return null;
  return cleaned.slice(0, PROPOSED_BRAND_NAME_MAX);
}

export interface SubmitQuoteItemInput {
  business_id: string;
  quote_id: string;
  rfq_item_id: string;
  quantity: number;
  unit_price?: number | null;
  notes?: string | null;
  /** RFQ-BRAND-PICKER-1E — optional approved brand the supplier is proposing. */
  proposed_brand_id?: string | null;
  /** RFQ-BRAND-PICKER-1E — optional free-text fallback (sanitized server-side). */
  proposed_brand_name?: string | null;
  /** RFQ-BRAND-PICKER-1E — initial computed match status (from pure helper). */
  brand_match_status?: BrandMatchStatus | null;
  /** RFQ-BRAND-PICKER-1E — initial review status (defaults to 'not_required'). */
  brand_review_status?: BrandReviewStatus;
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
  const rows = inputs.map((i) => {
    const proposed_brand_id = i.proposed_brand_id ?? null;
    const proposed_brand_name = sanitizeProposedBrandName(i.proposed_brand_name);
    return {
      business_id: i.business_id,
      quote_id: i.quote_id,
      rfq_item_id: i.rfq_item_id,
      quantity: i.quantity,
      unit_price: i.unit_price ?? null,
      total_price: calculateLineTotal(i.unit_price ?? null, i.quantity),
      notes: i.notes ?? null,
      proposed_brand_id,
      proposed_brand_name,
      brand_match_status: i.brand_match_status ?? null,
      brand_review_status: i.brand_review_status ?? 'not_required',
    };
  });
  const { data, error } = await supabase
    .from('procurement_supplier_quote_items')
    .upsert(rows as never, { onConflict: 'quote_id,rfq_item_id' })
    .select(SELECT);
  return {
    data: (data as unknown as ProcurementSupplierQuoteItemRow[] | null) ?? null,
    error,
  };
}

export interface UpdateProposedBrandInput {
  proposed_brand_id?: string | null;
  proposed_brand_name?: string | null;
  brand_match_status?: BrandMatchStatus | null;
  /**
   * Optional review-status transition. The DB-level trigger enforces the
   * legal transition graph; service-layer only sets `pending` when the
   * helper says a human must look at it.
   */
  brand_review_status?: Extract<BrandReviewStatus, 'not_required' | 'pending'>;
}

/**
 * RFQ-BRAND-PICKER-1E — update a quote line's proposed brand fields only.
 * Will never bump the row to `approved`/`rejected` — that path goes through
 * `reviewSupplierQuoteItemBrandEquivalence`.
 */
export async function updateSupplierQuoteItemProposedBrand(
  itemId: string,
  input: UpdateProposedBrandInput,
): Promise<{ data: ProcurementSupplierQuoteItemRow | null; error: unknown }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const patch: Record<string, any> = {};
  if (input.proposed_brand_id !== undefined) {
    patch.proposed_brand_id = input.proposed_brand_id;
    // Clearing brand id alone does not clear free-text — callers pass both
    // explicitly when they want to reset everything.
  }
  if (input.proposed_brand_name !== undefined) {
    patch.proposed_brand_name = sanitizeProposedBrandName(input.proposed_brand_name);
  }
  if (input.brand_match_status !== undefined) {
    patch.brand_match_status = input.brand_match_status;
  }
  if (input.brand_review_status !== undefined) {
    patch.brand_review_status = input.brand_review_status;
  }
  if (Object.keys(patch).length === 0) {
    return { data: null, error: new Error('empty_patch') };
  }
  const { data, error } = await supabase
    .from('procurement_supplier_quote_items')
    .update(patch as never)
    .eq('id', itemId)
    .select(SELECT)
    .maybeSingle();
  return {
    data: (data as unknown as ProcurementSupplierQuoteItemRow | null) ?? null,
    error,
  };
}

export interface ReviewBrandEquivalenceInput {
  decision: 'approved' | 'rejected';
  reviewer_id: string;
  note?: string | null;
}

/**
 * RFQ-BRAND-PICKER-1E — manager/admin equivalence review.
 * The DB trigger enforces that the item is currently `pending` (or already
 * approved/rejected → must be re-set to `pending` via the helper above before
 * a different decision is recorded).
 */
export async function reviewSupplierQuoteItemBrandEquivalence(
  itemId: string,
  input: ReviewBrandEquivalenceInput,
): Promise<{ data: ProcurementSupplierQuoteItemRow | null; error: unknown }> {
  if (input.decision !== 'approved' && input.decision !== 'rejected') {
    return { data: null, error: new Error('decision_invalid') };
  }
  if (!input.reviewer_id) {
    return { data: null, error: new Error('reviewer_required') };
  }
  const note =
    typeof input.note === 'string'
      ? input.note.replace(/\s+/g, ' ').trim().slice(0, REVIEW_NOTE_MAX) || null
      : null;
  const patch = {
    brand_review_status: input.decision,
    brand_match_status:
      input.decision === 'approved' ? 'approved_equivalent' : 'rejected_equivalent',
    brand_reviewed_by: input.reviewer_id,
    brand_reviewed_at: new Date().toISOString(),
    brand_review_note: note,
  };
  const { data, error } = await supabase
    .from('procurement_supplier_quote_items')
    .update(patch as never)
    .eq('id', itemId)
    .select(SELECT)
    .maybeSingle();
  return {
    data: (data as unknown as ProcurementSupplierQuoteItemRow | null) ?? null,
    error,
  };
}

/**
 * RFQ-BRAND-PICKER-1E — list quote items pending equivalence review for a
 * given business (scoped read for managers/admins). RLS still enforces
 * membership; we pin business_id as defence in depth.
 */
export async function listQuoteItemsWithBrandReview(
  businessId: string,
  reviewStatus: Extract<BrandReviewStatus, 'pending' | 'approved' | 'rejected'> = 'pending',
): Promise<{ data: ProcurementSupplierQuoteItemRow[] | null; error: unknown }> {
  const { data, error } = await supabase
    .from('procurement_supplier_quote_items')
    .select(SELECT)
    .eq('business_id', businessId)
    .eq('brand_review_status', reviewStatus)
    .order('updated_at', { ascending: false });
  return {
    data: (data as unknown as ProcurementSupplierQuoteItemRow[] | null) ?? null,
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
    data: (data as unknown as ProcurementSupplierQuoteItemRow[] | null) ?? null,
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
    data: (data as unknown as ProcurementSupplierQuoteItemRow[] | null) ?? null,
    error,
  };
}