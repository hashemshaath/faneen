import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * CT-4 — Service-level unit tests for the contract child-table wrappers.
 * Verifies exact table names, select/insert/update/delete chains, filters
 * and ordering for every wrapper.
 */

// Build a recursive chainable mock that records every call.
function makeChain() {
  const calls: Array<{ method: string; args: unknown[] }> = [];
  const target = { __calls: calls } as Record<string, unknown> & { __calls: typeof calls };
  const handler: ProxyHandler<typeof target> = {
    get(_t, prop: string) {
      if (prop === '__calls') return calls;
      if (prop === 'then') return undefined; // not a promise
      return (...args: unknown[]) => {
        calls.push({ method: prop, args });
        return new Proxy(target, handler);
      };
    },
  };
  return new Proxy(target, handler);
}

const chain = makeChain();
const fromMock = vi.fn(() => chain);

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (...args: unknown[]) => fromMock(...args) },
}));

import {
  listContractMilestones, createContractMilestone, updateContractMilestone,
  listContractNotes, createContractNote, deleteContractNote,
  listContractMeasurements, createContractMeasurement, updateContractMeasurement, deleteContractMeasurement,
  listContractAttachments, createContractAttachment, deleteContractAttachmentById,
  listInstallmentPlansForContract, getInstallmentPlanIdForContract,
  listInstallmentPaymentsByPlanIds, createInstallmentPlan, createInstallmentPayments,
  updateInstallmentPayment, updateInstallmentPaymentIfStatus,
} from '../childTables';

beforeEach(() => {
  fromMock.mockClear();
  (chain as { __calls: unknown[] }).__calls.length = 0;
});

const callsOf = () => (chain as { __calls: { method: string; args: unknown[] }[] }).__calls;

describe('CT-4 child-table service wrappers', () => {
  it('listContractMilestones: select * eq contract_id order sort_order', async () => {
    await listContractMilestones('c1');
    expect(fromMock).toHaveBeenCalledWith('contract_milestones');
    expect(callsOf()).toEqual([
      { method: 'select', args: ['*'] },
      { method: 'eq', args: ['contract_id', 'c1'] },
      { method: 'order', args: ['sort_order'] },
    ]);
  });

  it('createContractMilestone forwards payload to insert', async () => {
    const payload = { contract_id: 'c1', title_ar: 't', sort_order: 1 };
    await createContractMilestone(payload);
    expect(fromMock).toHaveBeenCalledWith('contract_milestones');
    expect(callsOf()).toEqual([{ method: 'insert', args: [payload] }]);
  });

  it('updateContractMilestone update().eq(id, …)', async () => {
    await updateContractMilestone('m1', { status: 'completed' });
    expect(callsOf()).toEqual([
      { method: 'update', args: [{ status: 'completed' }] },
      { method: 'eq', args: ['id', 'm1'] },
    ]);
  });

  it('listContractNotes uses created_at descending order', async () => {
    await listContractNotes('c1');
    expect(fromMock).toHaveBeenCalledWith('contract_notes');
    expect(callsOf()).toEqual([
      { method: 'select', args: ['*'] },
      { method: 'eq', args: ['contract_id', 'c1'] },
      { method: 'order', args: ['created_at', { ascending: false }] },
    ]);
  });

  it('createContractNote forwards payload', async () => {
    const p = { contract_id: 'c1', user_id: 'u1', content: 'x', note_type: 'note' };
    await createContractNote(p);
    expect(callsOf()).toEqual([{ method: 'insert', args: [p] }]);
  });

  it('deleteContractNote delete().eq(id, …)', async () => {
    await deleteContractNote('n1');
    expect(callsOf()).toEqual([
      { method: 'delete', args: [] },
      { method: 'eq', args: ['id', 'n1'] },
    ]);
  });

  it('listContractMeasurements eq + order sort_order', async () => {
    await listContractMeasurements('c1');
    expect(fromMock).toHaveBeenCalledWith('contract_measurements');
    expect(callsOf()).toEqual([
      { method: 'select', args: ['*'] },
      { method: 'eq', args: ['contract_id', 'c1'] },
      { method: 'order', args: ['sort_order'] },
    ]);
  });

  it('createContractMeasurement accepts single or array payloads', async () => {
    const single = { contract_id: 'c1', name_ar: 'a' };
    await createContractMeasurement(single);
    expect(callsOf()).toEqual([{ method: 'insert', args: [single] }]);
    (chain as { __calls: unknown[] }).__calls.length = 0;
    const arr = [{ a: 1 }, { a: 2 }];
    await createContractMeasurement(arr);
    expect(callsOf()).toEqual([{ method: 'insert', args: [arr] }]);
  });

  it('updateContractMeasurement forwards payload + eq(id, …)', async () => {
    const p = { length_mm: 1 };
    await updateContractMeasurement('m1', p);
    expect(callsOf()).toEqual([
      { method: 'update', args: [p] },
      { method: 'eq', args: ['id', 'm1'] },
    ]);
  });

  it('deleteContractMeasurement delete().eq(id, …)', async () => {
    await deleteContractMeasurement('m1');
    expect(callsOf()).toEqual([
      { method: 'delete', args: [] },
      { method: 'eq', args: ['id', 'm1'] },
    ]);
  });

  it('listContractAttachments uses created_at descending order', async () => {
    await listContractAttachments('c1');
    expect(fromMock).toHaveBeenCalledWith('contract_attachments');
    expect(callsOf()).toEqual([
      { method: 'select', args: ['*'] },
      { method: 'eq', args: ['contract_id', 'c1'] },
      { method: 'order', args: ['created_at', { ascending: false }] },
    ]);
  });

  it('createContractAttachment forwards payload', async () => {
    const p = { contract_id: 'c1', file_name: 'a' };
    await createContractAttachment(p);
    expect(callsOf()).toEqual([{ method: 'insert', args: [p] }]);
  });

  it('deleteContractAttachmentById delete().eq(id, …)', async () => {
    await deleteContractAttachmentById('a1');
    expect(callsOf()).toEqual([
      { method: 'delete', args: [] },
      { method: 'eq', args: ['id', 'a1'] },
    ]);
  });

  it('listInstallmentPlansForContract eq + order created_at desc', async () => {
    await listInstallmentPlansForContract('c1');
    expect(fromMock).toHaveBeenCalledWith('installment_plans');
    expect(callsOf()).toEqual([
      { method: 'select', args: ['*'] },
      { method: 'eq', args: ['contract_id', 'c1'] },
      { method: 'order', args: ['created_at', { ascending: false }] },
    ]);
  });

  it('getInstallmentPlanIdForContract uses select(id) + maybeSingle', async () => {
    await getInstallmentPlanIdForContract('c1');
    expect(callsOf()).toEqual([
      { method: 'select', args: ['id'] },
      { method: 'eq', args: ['contract_id', 'c1'] },
      { method: 'maybeSingle', args: [] },
    ]);
  });

  it('listInstallmentPaymentsByPlanIds uses in(plan_id) + order installment_number', async () => {
    await listInstallmentPaymentsByPlanIds(['p1', 'p2']);
    expect(fromMock).toHaveBeenCalledWith('installment_payments');
    expect(callsOf()).toEqual([
      { method: 'select', args: ['*'] },
      { method: 'in', args: ['plan_id', ['p1', 'p2']] },
      { method: 'order', args: ['installment_number'] },
    ]);
  });

  it('createInstallmentPlan defaults select to * and uses single', async () => {
    await createInstallmentPlan({ contract_id: 'c1' });
    expect(callsOf()).toEqual([
      { method: 'insert', args: [{ contract_id: 'c1' }] },
      { method: 'select', args: ['*'] },
      { method: 'single', args: [] },
    ]);
  });

  it('createInstallmentPlan honors custom select string', async () => {
    await createInstallmentPlan({ contract_id: 'c1' }, 'id');
    expect(callsOf()).toEqual([
      { method: 'insert', args: [{ contract_id: 'c1' }] },
      { method: 'select', args: ['id'] },
      { method: 'single', args: [] },
    ]);
  });

  it('createInstallmentPayments accepts single or array', async () => {
    await createInstallmentPayments([{ a: 1 }, { a: 2 }]);
    expect(callsOf()).toEqual([{ method: 'insert', args: [[{ a: 1 }, { a: 2 }]] }]);
  });

  it('updateInstallmentPayment update().eq(id, …)', async () => {
    await updateInstallmentPayment('p1', { status: 'paid' });
    expect(callsOf()).toEqual([
      { method: 'update', args: [{ status: 'paid' }] },
      { method: 'eq', args: ['id', 'p1'] },
    ]);
  });

  it('updateInstallmentPaymentIfStatus chains eq status + select id + maybeSingle', async () => {
    await updateInstallmentPaymentIfStatus('p1', { status: 'paid' }, 'pending');
    expect(callsOf()).toEqual([
      { method: 'update', args: [{ status: 'paid' }] },
      { method: 'eq', args: ['id', 'p1'] },
      { method: 'eq', args: ['status', 'pending'] },
      { method: 'select', args: ['id'] },
      { method: 'maybeSingle', args: [] },
    ]);
  });
});