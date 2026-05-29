import { describe, expect, it } from 'vitest';
import { compareSupplierQuotes } from '../services/quoteComparison';
import type { ProcurementSupplierQuoteRow } from '../types';

const base: Omit<ProcurementSupplierQuoteRow, 'id' | 'total_amount' | 'lead_time_days' | 'submitted_at' | 'status'> = {
  business_id: 'b1',
  rfq_id: 'rfq1',
  supplier_id: 's',
  currency: 'SAR',
  notes: null,
  rejection_reason: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

function make(
  id: string,
  total: number | null,
  lead: number | null,
  submitted: string | null,
  status: ProcurementSupplierQuoteRow['status'] = 'submitted',
): ProcurementSupplierQuoteRow {
  return {
    ...base,
    id,
    supplier_id: `sup-${id}`,
    total_amount: total,
    lead_time_days: lead,
    submitted_at: submitted,
    status,
  };
}

describe('compareSupplierQuotes', () => {
  it('sorts by total_amount, then lead_time_days, then submitted_at', () => {
    const quotes = [
      make('a', 100, 10, '2026-01-03T00:00:00Z'),
      make('b', 90, 12, '2026-01-02T00:00:00Z'),
      make('c', 90, 10, '2026-01-04T00:00:00Z'),
      make('d', 90, 10, '2026-01-01T00:00:00Z'),
    ];
    const ranked = compareSupplierQuotes(quotes).map((q) => q.id);
    expect(ranked).toEqual(['d', 'c', 'b', 'a']);
  });

  it('marks top quote as recommended', () => {
    const out = compareSupplierQuotes([
      make('x', 200, 5, '2026-01-01T00:00:00Z'),
      make('y', 150, 7, '2026-01-02T00:00:00Z'),
    ]);
    expect(out[0].id).toBe('y');
    expect(out[0].recommended).toBe(true);
    expect(out[1].recommended).toBe(false);
    expect(out[0].rank).toBe(1);
  });

  it('filters out draft and rejected quotes', () => {
    const out = compareSupplierQuotes([
      make('a', 50, 1, '2026-01-01T00:00:00Z', 'draft'),
      make('b', 80, 2, '2026-01-01T00:00:00Z', 'rejected'),
      make('c', 100, 3, '2026-01-01T00:00:00Z', 'submitted'),
    ]);
    expect(out.map((q) => q.id)).toEqual(['c']);
  });

  it('places null total_amount last', () => {
    const out = compareSupplierQuotes([
      make('a', null, 1, '2026-01-01T00:00:00Z'),
      make('b', 10, 5, '2026-01-01T00:00:00Z'),
    ]);
    expect(out[0].id).toBe('b');
  });
});