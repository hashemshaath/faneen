/**
 * BUSINESS-WORKFLOW-PROCUREMENT-1 — Pure quote comparison helper.
 *
 * MUST NOT import Supabase or any IO. Enforced by
 * `scripts/procurement-isolation-audit.mjs`.
 */
import type { ProcurementSupplierQuoteRow } from '../types';

export interface ScoredQuote extends ProcurementSupplierQuoteRow {
  /** 0..1, higher is better. Combines price + lead time. */
  score: number;
  /** Position in sorted order (1 = best). */
  rank: number;
  /** True for the top-ranked entry. */
  recommended: boolean;
}

function priceOf(q: ProcurementSupplierQuoteRow): number {
  return typeof q.total_amount === 'number' && Number.isFinite(q.total_amount)
    ? q.total_amount
    : Number.POSITIVE_INFINITY;
}

function leadOf(q: ProcurementSupplierQuoteRow): number {
  return typeof q.lead_time_days === 'number' && Number.isFinite(q.lead_time_days)
    ? q.lead_time_days
    : Number.POSITIVE_INFINITY;
}

function submittedOf(q: ProcurementSupplierQuoteRow): number {
  return q.submitted_at ? new Date(q.submitted_at).getTime() : Number.POSITIVE_INFINITY;
}

/**
 * Sort submitted quotes by:
 *   1. total_amount ascending (null/invalid last)
 *   2. lead_time_days ascending (null/invalid last)
 *   3. submitted_at ascending (null last)
 * Returns a new array. Quotes whose status is not `submitted` or `selected`
 * are filtered out so drafts/rejected entries never influence ranking.
 */
export function compareSupplierQuotes(
  quotes: ReadonlyArray<ProcurementSupplierQuoteRow>,
): ScoredQuote[] {
  const eligible = quotes.filter(
    (q) => q.status === 'submitted' || q.status === 'selected',
  );
  const sorted = [...eligible].sort((a, b) => {
    const dp = priceOf(a) - priceOf(b);
    if (dp !== 0) return dp;
    const dl = leadOf(a) - leadOf(b);
    if (dl !== 0) return dl;
    return submittedOf(a) - submittedOf(b);
  });
  const prices = sorted.map(priceOf).filter((n) => Number.isFinite(n));
  const leads = sorted.map(leadOf).filter((n) => Number.isFinite(n));
  const minPrice = prices.length ? Math.min(...prices) : 0;
  const maxPrice = prices.length ? Math.max(...prices) : 0;
  const minLead = leads.length ? Math.min(...leads) : 0;
  const maxLead = leads.length ? Math.max(...leads) : 0;

  return sorted.map((q, idx) => {
    const p = priceOf(q);
    const l = leadOf(q);
    const priceScore =
      Number.isFinite(p) && maxPrice > minPrice
        ? 1 - (p - minPrice) / (maxPrice - minPrice)
        : Number.isFinite(p)
        ? 1
        : 0;
    const leadScore =
      Number.isFinite(l) && maxLead > minLead
        ? 1 - (l - minLead) / (maxLead - minLead)
        : Number.isFinite(l)
        ? 1
        : 0;
    const score = Math.round((priceScore * 0.7 + leadScore * 0.3) * 1000) / 1000;
    return { ...q, score, rank: idx + 1, recommended: idx === 0 };
  });
}