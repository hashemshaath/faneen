import { describe, it, expect } from 'vitest';
import {
  computeRevenuePipeline,
  computeCycleTimes,
} from '@/modules/analytics/executiveKpis';

describe('COMMERCIAL-LAUNCH-FINAL-1 · Revenue pipeline', () => {
  it('groups quotations by open vs approved', () => {
    const r = computeRevenuePipeline({
      contracts: [],
      quotations: [
        { id: '1', status: 'draft' },
        { id: '2', status: 'sent' },
        { id: '3', status: 'approved' },
        { id: '4', status: 'accepted' },
        { id: '5', status: 'rejected' },
      ],
    });
    expect(r.openQuotations).toBe(2);
    expect(r.approvedQuotations).toBe(2);
  });

  it('groups contracts by draft vs active', () => {
    const r = computeRevenuePipeline({
      contracts: [
        { id: '1', status: 'draft' },
        { id: '2', status: 'pending_signature' },
        { id: '3', status: 'active' },
        { id: '4', status: 'in_progress' },
        { id: '5', status: 'completed' },
      ],
      quotations: [],
    });
    expect(r.draftContracts).toBe(2);
    expect(r.activeContracts).toBe(2);
  });

  it('returns zeros for empty input', () => {
    expect(computeRevenuePipeline({ contracts: [], quotations: [] })).toEqual({
      openQuotations: 0,
      approvedQuotations: 0,
      draftContracts: 0,
      activeContracts: 0,
    });
  });
});

describe('COMMERCIAL-LAUNCH-FINAL-1 · Cycle times', () => {
  it('averages quotation approval days', () => {
    const c = computeCycleTimes({
      contracts: [],
      quotations: [
        { id: '1', created_at: '2026-01-01T00:00:00Z', approved_at: '2026-01-03T00:00:00Z' },
        { id: '2', created_at: '2026-01-01T00:00:00Z', approved_at: '2026-01-05T00:00:00Z' },
      ],
      workOrders: [],
      appointments: [],
    });
    expect(c.avgQuotationApprovalDays).toBe(3);
  });

  it('skips incomplete work orders', () => {
    const c = computeCycleTimes({
      contracts: [],
      quotations: [],
      workOrders: [
        { id: '1', status: 'in_progress', created_at: '2026-01-01T00:00:00Z', completed_at: null },
        { id: '2', status: 'completed', created_at: '2026-01-01T00:00:00Z', completed_at: '2026-01-11T00:00:00Z' },
      ],
      appointments: [],
    });
    expect(c.avgWorkOrderCompletionDays).toBe(10);
  });

  it('returns zero when no data available', () => {
    const c = computeCycleTimes({ contracts: [], quotations: [], workOrders: [], appointments: [] });
    expect(c.avgQuotationApprovalDays).toBe(0);
    expect(c.avgContractConversionDays).toBe(0);
    expect(c.avgWorkOrderCompletionDays).toBe(0);
    expect(c.avgInstallationConfirmationDays).toBe(0);
  });

  it('handles installation confirmation deltas', () => {
    const c = computeCycleTimes({
      contracts: [],
      quotations: [],
      workOrders: [],
      appointments: [
        { id: '1', status: 'confirmed', scheduled_at: '2026-01-01T00:00:00Z', confirmed_at: '2026-01-02T00:00:00Z' },
      ],
    });
    expect(c.avgInstallationConfirmationDays).toBe(1);
  });

  it('ignores negative deltas (confirmed before scheduled)', () => {
    const c = computeCycleTimes({
      contracts: [],
      quotations: [
        { id: '1', created_at: '2026-01-10T00:00:00Z', approved_at: '2026-01-05T00:00:00Z' },
      ],
      workOrders: [],
      appointments: [],
    });
    expect(c.avgQuotationApprovalDays).toBe(0);
  });
});