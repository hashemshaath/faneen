import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * CT-8 — Service-level unit tests for the measurements / milestones /
 * notes child-table wrappers. CT-4 introduced these services; CT-8
 * re-verifies their exact shape and covers the newly added
 * deleteContractMilestone wrapper.
 */

function makeChain() {
  const calls: Array<{ method: string; args: unknown[] }> = [];
  const target = { __calls: calls } as Record<string, unknown> & { __calls: typeof calls };
  const handler: ProxyHandler<typeof target> = {
    get(_t, prop: string) {
      if (prop === '__calls') return calls;
      if (prop === 'then') return undefined;
      return (...args: unknown[]) => {
        calls.push({ method: prop, args });
        return new Proxy(target, handler);
      };
    },
  };
  return new Proxy(target, handler);
}

const chain = makeChain();
const fromMock = vi.fn((..._args: unknown[]) => chain);

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (...args: unknown[]) => fromMock(...(args as [unknown])) },
}));

import {
  listContractMeasurements, createContractMeasurement,
  updateContractMeasurement, deleteContractMeasurement,
  listContractMilestones, createContractMilestone,
  updateContractMilestone, deleteContractMilestone,
  listContractNotes, createContractNote, deleteContractNote,
} from '../childTables';

beforeEach(() => {
  fromMock.mockClear();
  (chain as { __calls: unknown[] }).__calls.length = 0;
});

const callsOf = () => (chain as { __calls: { method: string; args: unknown[] }[] }).__calls;

describe('CT-8 measurements service wrappers', () => {
  it('listContractMeasurements: select * eq contract_id order sort_order', async () => {
    await listContractMeasurements('c1');
    expect(fromMock).toHaveBeenCalledWith('contract_measurements');
    expect(callsOf()).toEqual([
      { method: 'select', args: ['*'] },
      { method: 'eq', args: ['contract_id', 'c1'] },
      { method: 'order', args: ['sort_order'] },
    ]);
  });

  it('createContractMeasurement forwards single / array payloads', async () => {
    await createContractMeasurement({ contract_id: 'c1', name_ar: 'a' });
    expect(callsOf()).toEqual([{ method: 'insert', args: [{ contract_id: 'c1', name_ar: 'a' }] }]);
    (chain as { __calls: unknown[] }).__calls.length = 0;
    await createContractMeasurement([{ a: 1 }, { a: 2 }]);
    expect(callsOf()).toEqual([{ method: 'insert', args: [[{ a: 1 }, { a: 2 }]] }]);
  });

  it('updateContractMeasurement update + eq(id)', async () => {
    await updateContractMeasurement('m1', { length_mm: 1 });
    expect(callsOf()).toEqual([
      { method: 'update', args: [{ length_mm: 1 }] },
      { method: 'eq', args: ['id', 'm1'] },
    ]);
  });

  it('deleteContractMeasurement delete + eq(id)', async () => {
    await deleteContractMeasurement('m1');
    expect(callsOf()).toEqual([
      { method: 'delete', args: [] },
      { method: 'eq', args: ['id', 'm1'] },
    ]);
  });
});

describe('CT-8 milestones service wrappers', () => {
  it('listContractMilestones: select * eq contract_id order sort_order', async () => {
    await listContractMilestones('c1');
    expect(fromMock).toHaveBeenCalledWith('contract_milestones');
    expect(callsOf()).toEqual([
      { method: 'select', args: ['*'] },
      { method: 'eq', args: ['contract_id', 'c1'] },
      { method: 'order', args: ['sort_order'] },
    ]);
  });

  it('createContractMilestone forwards payload', async () => {
    await createContractMilestone({ contract_id: 'c1', title_ar: 't', sort_order: 1 });
    expect(callsOf()).toEqual([
      { method: 'insert', args: [{ contract_id: 'c1', title_ar: 't', sort_order: 1 }] },
    ]);
  });

  it('updateContractMilestone update + eq(id)', async () => {
    await updateContractMilestone('m1', { status: 'completed' });
    expect(callsOf()).toEqual([
      { method: 'update', args: [{ status: 'completed' }] },
      { method: 'eq', args: ['id', 'm1'] },
    ]);
  });

  it('deleteContractMilestone delete + eq(id)', async () => {
    await deleteContractMilestone('m1');
    expect(fromMock).toHaveBeenCalledWith('contract_milestones');
    expect(callsOf()).toEqual([
      { method: 'delete', args: [] },
      { method: 'eq', args: ['id', 'm1'] },
    ]);
  });
});

describe('CT-8 notes service wrappers', () => {
  it('listContractNotes: select * eq contract_id order created_at desc', async () => {
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

  it('deleteContractNote delete + eq(id)', async () => {
    await deleteContractNote('n1');
    expect(callsOf()).toEqual([
      { method: 'delete', args: [] },
      { method: 'eq', args: ['id', 'n1'] },
    ]);
  });
});