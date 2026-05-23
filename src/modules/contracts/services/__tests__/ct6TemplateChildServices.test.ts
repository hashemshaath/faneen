import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * CT-6 — Service-level unit tests for the contract template child-table
 * wrappers (pricing rules, required fields, template attachments).
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
  listContractTemplatePricingRules,
  createContractTemplatePricingRule,
  updateContractTemplatePricingRule,
  deleteContractTemplatePricingRule,
  listContractTemplateRequiredFields,
  createContractTemplateRequiredField,
  updateContractTemplateRequiredField,
  deleteContractTemplateRequiredField,
  listContractTemplateAttachments,
  createContractTemplateAttachment,
  updateContractTemplateAttachment,
  deleteContractTemplateAttachment,
} from '../templates';

beforeEach(() => {
  fromMock.mockClear();
  (chain as { __calls: unknown[] }).__calls.length = 0;
});

const callsOf = () => (chain as { __calls: { method: string; args: unknown[] }[] }).__calls;

describe('CT-6 pricing rules wrappers', () => {
  it('list: default select * eq version_id, no order', async () => {
    await listContractTemplatePricingRules('v1');
    expect(fromMock).toHaveBeenCalledWith('contract_template_pricing_rules');
    expect(callsOf()).toEqual([
      { method: 'select', args: ['*'] },
      { method: 'eq', args: ['version_id', 'v1'] },
    ]);
  });

  it('create: insert(payload)', async () => {
    const payload = { version_id: 'v1', method: 'unit' };
    await createContractTemplatePricingRule(payload);
    expect(fromMock).toHaveBeenCalledWith('contract_template_pricing_rules');
    expect(callsOf()).toEqual([{ method: 'insert', args: [payload] }]);
  });

  it('update: update(payload).eq(id, …)', async () => {
    await updateContractTemplatePricingRule('r1', { method: 'area' });
    expect(callsOf()).toEqual([
      { method: 'update', args: [{ method: 'area' }] },
      { method: 'eq', args: ['id', 'r1'] },
    ]);
  });

  it('delete: delete().eq(id, …)', async () => {
    await deleteContractTemplatePricingRule('r1');
    expect(callsOf()).toEqual([
      { method: 'delete', args: [] },
      { method: 'eq', args: ['id', 'r1'] },
    ]);
  });
});

describe('CT-6 required fields wrappers', () => {
  it('list: default select * eq version_id order sort_order asc', async () => {
    await listContractTemplateRequiredFields('v1');
    expect(fromMock).toHaveBeenCalledWith('contract_template_required_fields');
    expect(callsOf()).toEqual([
      { method: 'select', args: ['*'] },
      { method: 'eq', args: ['version_id', 'v1'] },
      { method: 'order', args: ['sort_order', { ascending: true }] },
    ]);
  });

  it('list: orderBy=null omits order (cloneDraft path)', async () => {
    await listContractTemplateRequiredFields('v1', { orderBy: null });
    expect(callsOf()).toEqual([
      { method: 'select', args: ['*'] },
      { method: 'eq', args: ['version_id', 'v1'] },
    ]);
  });

  it('create: insert(payload)', async () => {
    const payload = { version_id: 'v1', field_key: 'f1' };
    await createContractTemplateRequiredField(payload);
    expect(callsOf()).toEqual([{ method: 'insert', args: [payload] }]);
  });

  it('update: update.eq(id)', async () => {
    await updateContractTemplateRequiredField('f1', { label_ar: 'x' });
    expect(callsOf()).toEqual([
      { method: 'update', args: [{ label_ar: 'x' }] },
      { method: 'eq', args: ['id', 'f1'] },
    ]);
  });

  it('delete: delete.eq(id)', async () => {
    await deleteContractTemplateRequiredField('f1');
    expect(callsOf()).toEqual([
      { method: 'delete', args: [] },
      { method: 'eq', args: ['id', 'f1'] },
    ]);
  });
});

describe('CT-6 template attachments wrappers', () => {
  it('list: default select * eq version_id order precedence_order asc', async () => {
    await listContractTemplateAttachments('v1');
    expect(fromMock).toHaveBeenCalledWith('contract_template_attachments');
    expect(callsOf()).toEqual([
      { method: 'select', args: ['*'] },
      { method: 'eq', args: ['version_id', 'v1'] },
      { method: 'order', args: ['precedence_order', { ascending: true }] },
    ]);
  });

  it('list: orderBy=null omits order (cloneDraft path)', async () => {
    await listContractTemplateAttachments('v1', { orderBy: null });
    expect(callsOf()).toEqual([
      { method: 'select', args: ['*'] },
      { method: 'eq', args: ['version_id', 'v1'] },
    ]);
  });

  it('create: insert(payload)', async () => {
    const payload = { version_id: 'v1', kind: 'reference' };
    await createContractTemplateAttachment(payload);
    expect(callsOf()).toEqual([{ method: 'insert', args: [payload] }]);
  });

  it('update: update.eq(id)', async () => {
    await updateContractTemplateAttachment('a1', { title_ar: 'x' });
    expect(callsOf()).toEqual([
      { method: 'update', args: [{ title_ar: 'x' }] },
      { method: 'eq', args: ['id', 'a1'] },
    ]);
  });

  it('delete: delete.eq(id)', async () => {
    await deleteContractTemplateAttachment('a1');
    expect(callsOf()).toEqual([
      { method: 'delete', args: [] },
      { method: 'eq', args: ['id', 'a1'] },
    ]);
  });
});