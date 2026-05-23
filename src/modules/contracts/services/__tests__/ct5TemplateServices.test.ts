import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * CT-5 — Service-level unit tests for the contract template admin wrappers.
 * Verifies exact table names, select/insert/update/delete chains, filters,
 * and ordering for every wrapper.
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
  updateContractTemplateById,
  listContractTemplateVersions,
  createContractTemplateVersion,
  listContractTemplateSections,
  listContractTemplateSectionsByVersionIds,
  createContractTemplateSection,
  updateContractTemplateSection,
  deleteContractTemplateSection,
  listContractTemplateClausesBySectionIds,
  createContractTemplateClause,
  updateContractTemplateClause,
  deleteContractTemplateClause,
  listContractMeasurementMethods,
} from '../templates';

beforeEach(() => {
  fromMock.mockClear();
  (chain as { __calls: unknown[] }).__calls.length = 0;
});

const callsOf = () => (chain as { __calls: { method: string; args: unknown[] }[] }).__calls;

describe('CT-5 template service wrappers', () => {
  it('updateContractTemplateById: update().eq(id, …)', async () => {
    await updateContractTemplateById('t1', { is_active: false });
    expect(fromMock).toHaveBeenCalledWith('contract_templates');
    expect(callsOf()).toEqual([
      { method: 'update', args: [{ is_active: false }] },
      { method: 'eq', args: ['id', 't1'] },
    ]);
  });

  it('listContractTemplateVersions: select * eq template_id order version_number desc', async () => {
    await listContractTemplateVersions('t1');
    expect(fromMock).toHaveBeenCalledWith('contract_template_versions');
    expect(callsOf()).toEqual([
      { method: 'select', args: ['*'] },
      { method: 'eq', args: ['template_id', 't1'] },
      { method: 'order', args: ['version_number', { ascending: false }] },
    ]);
  });

  it('createContractTemplateVersion: insert(payload).select(*).single()', async () => {
    const payload = { template_id: 't1', version_number: 2, status: 'draft' };
    await createContractTemplateVersion(payload, '*');
    expect(fromMock).toHaveBeenCalledWith('contract_template_versions');
    expect(callsOf()).toEqual([
      { method: 'insert', args: [payload] },
      { method: 'select', args: ['*'] },
      { method: 'single', args: [] },
    ]);
  });

  it('listContractTemplateSections: select * eq version_id order sort_order asc', async () => {
    await listContractTemplateSections('v1');
    expect(fromMock).toHaveBeenCalledWith('contract_template_sections');
    expect(callsOf()).toEqual([
      { method: 'select', args: ['*'] },
      { method: 'eq', args: ['version_id', 'v1'] },
      { method: 'order', args: ['sort_order', { ascending: true }] },
    ]);
  });

  it('listContractTemplateSectionsByVersionIds: select id,version_id in version_id', async () => {
    await listContractTemplateSectionsByVersionIds(['v1', 'v2']);
    expect(fromMock).toHaveBeenCalledWith('contract_template_sections');
    expect(callsOf()).toEqual([
      { method: 'select', args: ['id,version_id'] },
      { method: 'in', args: ['version_id', ['v1', 'v2']] },
    ]);
  });

  it('createContractTemplateSection without select: insert only', async () => {
    const payload = { version_id: 'v1', section_key: 'k', title_ar: 'a', sort_order: 0 };
    await createContractTemplateSection(payload);
    expect(fromMock).toHaveBeenCalledWith('contract_template_sections');
    expect(callsOf()).toEqual([{ method: 'insert', args: [payload] }]);
  });

  it('createContractTemplateSection with select: insert.select.single', async () => {
    const payload = { version_id: 'v1', section_key: 'k', title_ar: 'a', sort_order: 0 };
    await createContractTemplateSection(payload, 'id');
    expect(callsOf()).toEqual([
      { method: 'insert', args: [payload] },
      { method: 'select', args: ['id'] },
      { method: 'single', args: [] },
    ]);
  });

  it('updateContractTemplateSection: update(payload).eq(id, …)', async () => {
    await updateContractTemplateSection('s1', { title_ar: 'x' });
    expect(callsOf()).toEqual([
      { method: 'update', args: [{ title_ar: 'x' }] },
      { method: 'eq', args: ['id', 's1'] },
    ]);
  });

  it('deleteContractTemplateSection: delete().eq(id, …)', async () => {
    await deleteContractTemplateSection('s1');
    expect(callsOf()).toEqual([
      { method: 'delete', args: [] },
      { method: 'eq', args: ['id', 's1'] },
    ]);
  });

  it('listContractTemplateClausesBySectionIds: defaults select * order sort_order asc', async () => {
    await listContractTemplateClausesBySectionIds(['s1']);
    expect(fromMock).toHaveBeenCalledWith('contract_template_clauses');
    expect(callsOf()).toEqual([
      { method: 'select', args: ['*'] },
      { method: 'in', args: ['section_id', ['s1']] },
      { method: 'order', args: ['sort_order', { ascending: true }] },
    ]);
  });

  it('listContractTemplateClausesBySectionIds: orderBy=null omits order', async () => {
    await listContractTemplateClausesBySectionIds(['s1'], { select: 'id,section_id', orderBy: null });
    expect(callsOf()).toEqual([
      { method: 'select', args: ['id,section_id'] },
      { method: 'in', args: ['section_id', ['s1']] },
    ]);
  });

  it('createContractTemplateClause: insert(payload)', async () => {
    const payload = { section_id: 's1', body_ar: 'x', sort_order: 0 };
    await createContractTemplateClause(payload);
    expect(fromMock).toHaveBeenCalledWith('contract_template_clauses');
    expect(callsOf()).toEqual([{ method: 'insert', args: [payload] }]);
  });

  it('updateContractTemplateClause: update.eq(id)', async () => {
    await updateContractTemplateClause('c1', { body_ar: 'y' });
    expect(callsOf()).toEqual([
      { method: 'update', args: [{ body_ar: 'y' }] },
      { method: 'eq', args: ['id', 'c1'] },
    ]);
  });

  it('deleteContractTemplateClause: delete.eq(id)', async () => {
    await deleteContractTemplateClause('c1');
    expect(callsOf()).toEqual([
      { method: 'delete', args: [] },
      { method: 'eq', args: ['id', 'c1'] },
    ]);
  });

  it('listContractMeasurementMethods: default select+order id', async () => {
    await listContractMeasurementMethods();
    expect(fromMock).toHaveBeenCalledWith('contract_measurement_methods');
    expect(callsOf()).toEqual([
      { method: 'select', args: ['id,label_ar,label_en,symbol,decimals,is_active'] },
      { method: 'order', args: ['id'] },
    ]);
  });
});