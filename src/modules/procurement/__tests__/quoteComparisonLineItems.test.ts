import { describe, expect, it } from 'vitest';
import {
  calculateQuoteTotals,
  compareQuotesWithLineItems,
  type QuoteComparisonInput,
} from '../services/quoteComparisonLineItems';
import type {
  ProcurementRfqItemRow,
  ProcurementSupplierQuoteItemRow,
  ProcurementSupplierQuoteRow,
} from '../types';

function rfqItem(id: string, sort = 0): ProcurementRfqItemRow {
  return {
    id,
    business_id: 'b1',
    rfq_id: 'rfq1',
    procurement_request_id: null,
    name: id,
    description: null,
    quantity: 1,
    unit: null,
    target_price: null,
    sort_order: sort,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  };
}

function quote(
  id: string,
  total: number | null,
  lead: number | null,
  submitted: string | null,
  status: ProcurementSupplierQuoteRow['status'] = 'submitted',
): ProcurementSupplierQuoteRow {
  return {
    id,
    business_id: 'b1',
    rfq_id: 'rfq1',
    supplier_id: `sup-${id}`,
    status,
    total_amount: total,
    currency: 'SAR',
    lead_time_days: lead,
    notes: null,
    submitted_at: submitted,
    rejection_reason: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  };
}

function qItem(
  quote_id: string,
  rfq_item_id: string,
  unit_price: number | null,
  qty = 1,
): ProcurementSupplierQuoteItemRow {
  return {
    id: `${quote_id}-${rfq_item_id}`,
    business_id: 'b1',
    quote_id,
    rfq_item_id,
    unit_price,
    quantity: qty,
    total_price: unit_price == null ? null : unit_price * qty,
    notes: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  };
}

describe('calculateQuoteTotals', () => {
  it('sums total_price when present', () => {
    expect(
      calculateQuoteTotals([qItem('q', 'a', 10, 2), qItem('q', 'b', 5, 3)]),
    ).toBe(35);
  });
  it('falls back to unit_price * quantity', () => {
    const rows: ProcurementSupplierQuoteItemRow[] = [
      { ...qItem('q', 'a', 10, 2), total_price: null },
    ];
    expect(calculateQuoteTotals(rows)).toBe(20);
  });
  it('returns 0 when no priced items', () => {
    expect(calculateQuoteTotals([qItem('q', 'a', null, 1)])).toBe(0);
  });
});

describe('compareQuotesWithLineItems', () => {
  const rfqItems = [rfqItem('i1', 0), rfqItem('i2', 1)];

  it('sorts by completeness DESC, then total ASC, then lead ASC', () => {
    const inputs: QuoteComparisonInput[] = [
      { quote: quote('a', 100, 10, '2026-01-01T00:00:00Z'), items: [qItem('a', 'i1', 50)] },
      {
        quote: quote('b', 120, 7, '2026-01-01T00:00:00Z'),
        items: [qItem('b', 'i1', 60), qItem('b', 'i2', 60)],
      },
      {
        quote: quote('c', 110, 5, '2026-01-01T00:00:00Z'),
        items: [qItem('c', 'i1', 50), qItem('c', 'i2', 60)],
      },
    ];
    const out = compareQuotesWithLineItems(rfqItems, inputs);
    expect(out.map((q) => q.quote_id)).toEqual(['c', 'b', 'a']);
    expect(out[0].recommended).toBe(true);
    expect(out[2].recommended).toBe(false);
    expect(out[2].warnings).toContain('missing_items');
    expect(out[2].missing_rfq_item_ids).toEqual(['i2']);
  });

  it('filters out draft / rejected / awarded statuses', () => {
    const inputs: QuoteComparisonInput[] = [
      { quote: quote('a', 1, 1, null, 'draft'), items: [] },
      { quote: quote('b', 1, 1, null, 'rejected'), items: [] },
      { quote: quote('c', 1, 1, null, 'awarded'), items: [] },
      { quote: quote('d', 10, 5, null, 'submitted'), items: [] },
    ];
    const out = compareQuotesWithLineItems(rfqItems, inputs);
    expect(out.map((q) => q.quote_id)).toEqual(['d']);
  });

  it('flags no_total when stored total absent and no line totals', () => {
    const inputs: QuoteComparisonInput[] = [
      { quote: quote('a', null, null, null), items: [] },
    ];
    const out = compareQuotesWithLineItems(rfqItems, inputs);
    expect(out[0].warnings).toContain('no_total');
    expect(out[0].warnings).toContain('missing_items');
    expect(out[0].recommended).toBe(false);
  });

  it('uses computed total when stored total is null', () => {
    const inputs: QuoteComparisonInput[] = [
      { quote: quote('a', 999, 10, null), items: [qItem('a', 'i1', 50), qItem('a', 'i2', 50)] },
      { quote: quote('b', null, 10, null), items: [qItem('b', 'i1', 40), qItem('b', 'i2', 40)] },
    ];
    const out = compareQuotesWithLineItems(rfqItems, inputs);
    // b should win on price using its computed total (80) vs a's stored 999
    expect(out[0].quote_id).toBe('b');
  });
});