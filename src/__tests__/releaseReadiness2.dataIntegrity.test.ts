import { describe, it, expect } from 'vitest';
import {
  runDataIntegrityChecks,
  INTEGRITY_LABELS,
  type DataIntegrityInput,
} from '@/modules/health/dataIntegrity';

const empty: DataIntegrityInput = {
  contracts: [],
  workOrders: [],
  quotations: [],
  closures: [],
  warranties: [],
  appointments: [],
  rfqs: [],
  rfqSuppliers: [],
  rfqQuotes: [],
  purchaseOrders: [],
  trackingLinks: [],
};

describe('PRR-2 — data integrity checks', () => {
  it('returns zero findings on empty input', () => {
    const r = runDataIntegrityChecks(empty);
    expect(r.totalIssues).toBe(0);
    expect(r.summary).toHaveLength(12);
  });

  it('flags active contracts without work orders', () => {
    const r = runDataIntegrityChecks({
      ...empty,
      contracts: [{ id: 'c1', ref_id: 'CONTRACT-1', status: 'active' }],
    });
    expect(r.findings.contracts_without_work_orders).toHaveLength(1);
    expect(r.findings.contracts_without_work_orders[0].ref).toBe('CONTRACT-1');
  });

  it('ignores draft contracts (only active are blockers)', () => {
    const r = runDataIntegrityChecks({
      ...empty,
      contracts: [{ id: 'c1', ref_id: 'CONTRACT-1', status: 'draft' }],
    });
    expect(r.findings.contracts_without_work_orders).toHaveLength(0);
  });

  it('flags completed work orders missing a closure', () => {
    const r = runDataIntegrityChecks({
      ...empty,
      workOrders: [{ id: 'w1', ref_id: 'WO-1', status: 'completed' }],
    });
    expect(r.findings.completed_work_orders_without_closure).toHaveLength(1);
  });

  it('closures with matching warranty are healthy', () => {
    const r = runDataIntegrityChecks({
      ...empty,
      closures: [{ id: 'cls1', ref_id: 'CLS-1', work_order_id: 'w1', status: 'confirmed' }],
      warranties: [{ id: 'war1', ref_id: 'WAR-1', work_order_id: 'w1', status: 'active' }],
    });
    expect(r.findings.closures_without_warranty).toHaveLength(0);
  });

  it('flags awarded RFQ without PO', () => {
    const r = runDataIntegrityChecks({
      ...empty,
      rfqs: [{ id: 'r1', ref_id: 'RFQ-1', status: 'awarded' }],
    });
    expect(r.findings.awarded_rfqs_without_po).toHaveLength(1);
  });

  it('expired_warranties uses provided clock', () => {
    const r = runDataIntegrityChecks({
      ...empty,
      warranties: [{ id: 'w1', ref_id: 'WAR-1', work_order_id: 'wo1', status: 'active', expires_at: '2020-01-01' }],
      now: new Date('2026-01-01').getTime(),
    });
    expect(r.findings.expired_warranties).toHaveLength(1);
  });

  it('has bilingual labels for every check key', () => {
    const r = runDataIntegrityChecks(empty);
    for (const s of r.summary) {
      expect(INTEGRITY_LABELS[s.key].ar.length).toBeGreaterThan(0);
      expect(INTEGRITY_LABELS[s.key].en.length).toBeGreaterThan(0);
    }
  });

  it('never exposes raw UUIDs in ref field when ref_id missing', () => {
    const r = runDataIntegrityChecks({
      ...empty,
      quotations: [{ id: '00000000-0000-0000-0000-000000000000', ref_id: null, customer_id: null }],
    });
    expect(r.findings.quotations_without_customer[0].ref).toBe('');
  });
});