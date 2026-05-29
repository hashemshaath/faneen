import { describe, expect, it } from 'vitest';
import { evaluateAwardEligibility } from '../services/awardEligibility';
import type {
  ProcurementRfqRow,
  ProcurementSupplierQuoteRow,
} from '../types';

const rfq: ProcurementRfqRow = {
  id: 'rfq-1',
  business_id: 'b1',
  procurement_request_id: 'req-1',
  rfq_number: 'RFQ-1000001',
  status: 'sent',
  due_at: null,
  expires_at: null,
  sent_at: '2026-01-01T00:00:00Z',
  closed_at: null,
  awarded_quote_id: null,
  created_by: 'u1',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const quote: ProcurementSupplierQuoteRow = {
  id: 'q1',
  business_id: 'b1',
  rfq_id: 'rfq-1',
  supplier_id: 'sup-1',
  status: 'submitted',
  total_amount: 1000,
  currency: 'SAR',
  lead_time_days: 10,
  notes: null,
  submitted_at: '2026-01-02T00:00:00Z',
  rejection_reason: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-02T00:00:00Z',
};

describe('evaluateAwardEligibility', () => {
  it('allows happy path', () => {
    expect(evaluateAwardEligibility(quote, rfq)).toEqual({ eligible: true });
  });

  it('rejects when quote missing', () => {
    expect(evaluateAwardEligibility(null, rfq).reason).toBe('quote_missing');
  });

  it('rejects when rfq missing', () => {
    expect(evaluateAwardEligibility(quote, null).reason).toBe('rfq_missing');
  });

  it('rejects when quote belongs to a different rfq', () => {
    expect(
      evaluateAwardEligibility({ ...quote, rfq_id: 'other' }, rfq).reason,
    ).toBe('rfq_mismatch');
  });

  it('rejects when rfq already awarded', () => {
    expect(
      evaluateAwardEligibility(quote, { ...rfq, awarded_quote_id: 'qX' }).reason,
    ).toBe('rfq_already_awarded');
  });

  it('rejects when rfq closed', () => {
    expect(
      evaluateAwardEligibility(quote, { ...rfq, status: 'closed' }).reason,
    ).toBe('rfq_not_open');
  });

  it('rejects when quote not eligible (e.g. draft)', () => {
    expect(
      evaluateAwardEligibility({ ...quote, status: 'draft' }, rfq).reason,
    ).toBe('quote_not_eligible');
  });

  it('allows shortlisted quotes', () => {
    expect(
      evaluateAwardEligibility({ ...quote, status: 'shortlisted' }, rfq),
    ).toEqual({ eligible: true });
  });
});