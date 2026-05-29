/**
 * BUSINESS-WORKFLOW-PROCUREMENT-3 — Pure line-item-aware quote comparison.
 * MUST NOT import Supabase or perform any IO. Enforced by
 * `scripts/procurement-isolation-audit.mjs`.
 */
import type {
  ProcurementSupplierQuoteRow,
  ProcurementSupplierQuoteItemRow,
  ProcurementRfqItemRow,
} from '../types';

export interface QuoteComparisonInput {
  quote: ProcurementSupplierQuoteRow;
  items: ReadonlyArray<ProcurementSupplierQuoteItemRow>;
}

export type LineItemRecommendationReason =
  | 'lowest_total'
  | 'fastest_lead_time'
  | 'most_complete'
  | 'missing_items'
  | 'no_total';

export interface QuoteComparisonResult {
  quote_id: string;
  supplier_id: string;
  total: number | null;
  computed_total: number;
  lead_time_days: number | null;
  submitted_at: string | null;
  /** Number of RFQ items priced (or quantity-quoted) by this supplier. */
  items_covered: number;
  items_required: number;
  /** items_covered / items_required, 0..1, 1 = complete. */
  completeness: number;
  missing_rfq_item_ids: string[];
  rank: number;
  recommended: boolean;
  reasons: LineItemRecommendationReason[];
  warnings: string[];
}

function safeNum(n: number | null | undefined): number {
  return typeof n === 'number' && Number.isFinite(n) ? n : Number.POSITIVE_INFINITY;
}

/** Sum of a quote's line totals (using stored total_price, else unit*qty). */
export function calculateQuoteTotals(
  items: ReadonlyArray<ProcurementSupplierQuoteItemRow>,
): number {
  let sum = 0;
  for (const it of items) {
    if (typeof it.total_price === 'number' && Number.isFinite(it.total_price)) {
      sum += it.total_price;
    } else if (
      typeof it.unit_price === 'number' &&
      Number.isFinite(it.unit_price) &&
      typeof it.quantity === 'number' &&
      Number.isFinite(it.quantity)
    ) {
      sum += it.unit_price * it.quantity;
    }
  }
  return Math.round(sum * 100) / 100;
}

/**
 * Compares supplier quotes with line-item awareness.
 *
 * Sorting precedence:
 *   1. completeness DESC (more covered items wins)
 *   2. effective total ASC (computed from line items if quote.total_amount missing)
 *   3. lead_time_days ASC
 *   4. submitted_at ASC
 *
 * Quotes whose status is not `submitted` / `selected` / `shortlisted` are
 * filtered out so drafts/rejected/awarded entries never re-rank.
 */
export function compareQuotesWithLineItems(
  rfqItems: ReadonlyArray<ProcurementRfqItemRow>,
  inputs: ReadonlyArray<QuoteComparisonInput>,
): QuoteComparisonResult[] {
  const required = rfqItems.length;
  const requiredIds = new Set(rfqItems.map((i) => i.id));

  const eligible = inputs.filter(
    ({ quote }) =>
      quote.status === 'submitted' ||
      quote.status === 'selected' ||
      quote.status === 'shortlisted',
  );

  const enriched = eligible.map(({ quote, items }) => {
    const covered = new Set(
      items
        .filter((i) => requiredIds.has(i.rfq_item_id))
        .map((i) => i.rfq_item_id),
    );
    const missing = [...requiredIds].filter((id) => !covered.has(id));
    const computed = calculateQuoteTotals(items);
    const totalStored =
      typeof quote.total_amount === 'number' && Number.isFinite(quote.total_amount)
        ? quote.total_amount
        : null;
    const completeness = required === 0 ? 1 : covered.size / required;
    const warnings: string[] = [];
    if (missing.length > 0) warnings.push('missing_items');
    if (totalStored === null && computed === 0) warnings.push('no_total');
    return {
      quote_id: quote.id,
      supplier_id: quote.supplier_id,
      total: totalStored,
      computed_total: computed,
      lead_time_days: quote.lead_time_days,
      submitted_at: quote.submitted_at,
      items_covered: covered.size,
      items_required: required,
      completeness: Math.round(completeness * 1000) / 1000,
      missing_rfq_item_ids: missing,
      warnings,
    };
  });

  const sorted = [...enriched].sort((a, b) => {
    if (a.completeness !== b.completeness) return b.completeness - a.completeness;
    const at = a.total ?? a.computed_total;
    const bt = b.total ?? b.computed_total;
    const da = safeNum(at) - safeNum(bt);
    if (da !== 0) return da;
    const dl = safeNum(a.lead_time_days) - safeNum(b.lead_time_days);
    if (dl !== 0) return dl;
    const sa = a.submitted_at ? new Date(a.submitted_at).getTime() : Number.POSITIVE_INFINITY;
    const sb = b.submitted_at ? new Date(b.submitted_at).getTime() : Number.POSITIVE_INFINITY;
    return sa - sb;
  });

  const totals = sorted.map((q) => safeNum(q.total ?? q.computed_total));
  const leads = sorted.map((q) => safeNum(q.lead_time_days));
  const minTotal = totals.length ? Math.min(...totals) : Number.POSITIVE_INFINITY;
  const minLead = leads.length ? Math.min(...leads) : Number.POSITIVE_INFINITY;
  const maxCompleteness = sorted.reduce((m, q) => Math.max(m, q.completeness), 0);

  return sorted.map((q, idx) => {
    const reasons: LineItemRecommendationReason[] = [];
    if (q.completeness >= maxCompleteness && q.completeness > 0)
      reasons.push('most_complete');
    const effective = q.total ?? q.computed_total;
    if (Number.isFinite(effective) && safeNum(effective) === minTotal)
      reasons.push('lowest_total');
    if (q.lead_time_days != null && safeNum(q.lead_time_days) === minLead)
      reasons.push('fastest_lead_time');
    if (q.missing_rfq_item_ids.length > 0) reasons.push('missing_items');
    if (q.total == null && q.computed_total === 0) reasons.push('no_total');
    return {
      ...q,
      rank: idx + 1,
      recommended: idx === 0 && q.missing_rfq_item_ids.length === 0,
      reasons,
    };
  });
}