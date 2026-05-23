import { describe, it, expect, vi, beforeEach } from 'vitest';

const rpcMock = vi.fn();
const updateMock = vi.fn();
const eqMock = vi.fn();
const fromMock = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: (...args: unknown[]) => rpcMock(...args),
    from: (...args: unknown[]) => fromMock(...args),
  },
}));

import { updateContractById } from '../updateContractById';
import { createContractFromTemplate } from '../createContractFromTemplate';
import { updateContractDraftAutosave } from '../updateContractDraftAutosave';
import { searchContractClients } from '../searchContractClients';
import { quickResolveContractClient } from '../quickResolveContractClient';
import { listClientSitesForContract } from '../listClientSitesForContract';
import { verifyContractPublic } from '../verifyContractPublic';
import {
  listContractPdfExports,
  adminListContractPdfExports,
  adminContractPdfExportsSummary,
} from '../pdfExports';

beforeEach(() => {
  rpcMock.mockReset();
  updateMock.mockReset();
  eqMock.mockReset();
  fromMock.mockReset();
  fromMock.mockReturnValue({ update: updateMock });
  updateMock.mockReturnValue({ eq: eqMock });
  eqMock.mockResolvedValue({ data: null, error: null });
});

describe('CT-3 service wrappers', () => {
  it('updateContractById hits from(contracts).update(payload).eq(id, …)', async () => {
    const payload = { title_ar: 'x', total_amount: 1 };
    const r = await updateContractById('c1', payload);
    expect(fromMock).toHaveBeenCalledWith('contracts');
    expect(updateMock).toHaveBeenCalledWith(payload);
    expect(eqMock).toHaveBeenCalledWith('id', 'c1');
    expect(r).toEqual({ data: null, error: null });
  });

  it('createContractFromTemplate forwards exact RPC + raw shape', async () => {
    rpcMock.mockResolvedValueOnce({ data: 'new-id', error: null });
    const args = { _payload: { a: 1 }, _template_version_id: 'v1', _pricing_method: 'cost_plus' };
    const r = await createContractFromTemplate(args as never);
    expect(rpcMock).toHaveBeenCalledWith('create_contract_from_template', args);
    expect(r).toEqual({ data: 'new-id', error: null });
  });

  it('updateContractDraftAutosave forwards _contract_id/_patch/_expected_updated_at', async () => {
    rpcMock.mockResolvedValueOnce({ data: { updated_at: 'ts' }, error: null });
    const args = { _contract_id: 'c1', _patch: { f: 1 } as never, _expected_updated_at: 'prev' };
    const r = await updateContractDraftAutosave(args);
    expect(rpcMock).toHaveBeenCalledWith('update_contract_draft_autosave', args);
    expect(r.data).toEqual({ updated_at: 'ts' });
  });

  it('searchContractClients uses _q', async () => {
    rpcMock.mockResolvedValueOnce({ data: [], error: null });
    await searchContractClients({ _q: 'foo' });
    expect(rpcMock).toHaveBeenCalledWith('search_contract_clients', { _q: 'foo' });
  });

  it('quickResolveContractClient passes _email + _phone', async () => {
    rpcMock.mockResolvedValueOnce({ data: [], error: null });
    await quickResolveContractClient({ _email: 'a@b', _phone: null });
    expect(rpcMock).toHaveBeenCalledWith('quick_resolve_contract_client', { _email: 'a@b', _phone: null });
  });

  it('listClientSitesForContract uses _business_id + _client_user_id', async () => {
    rpcMock.mockResolvedValueOnce({ data: [], error: null });
    await listClientSitesForContract({ _business_id: 'b1', _client_user_id: 'u1' });
    expect(rpcMock).toHaveBeenCalledWith('list_client_sites_for_contract', {
      _business_id: 'b1', _client_user_id: 'u1',
    });
  });

  it('verifyContractPublic forwards _contract_number/_hash/_barcode_code', async () => {
    rpcMock.mockResolvedValueOnce({ data: { ok: true }, error: null });
    await verifyContractPublic({ _contract_number: '1', _hash: 'h', _barcode_code: null });
    expect(rpcMock).toHaveBeenCalledWith('verify_contract_public', {
      _contract_number: '1', _hash: 'h', _barcode_code: null,
    });
  });

  it('listContractPdfExports forwards full args', async () => {
    rpcMock.mockResolvedValueOnce({ data: [], error: null });
    const args = {
      _contract_id: 'c1', _search: null, _source: null,
      _contract_version: null, _template_version_number: null,
      _limit: 20, _offset: 0,
    };
    await listContractPdfExports(args);
    expect(rpcMock).toHaveBeenCalledWith('list_contract_pdf_exports', args);
  });

  it('adminListContractPdfExports forwards full admin args', async () => {
    rpcMock.mockResolvedValueOnce({ data: [], error: null });
    const args = {
      _search: null, _source: null, _contract_status: null,
      _template_version_number: null, _date_from: null, _date_to: null,
      _limit: 50, _offset: 0,
    };
    await adminListContractPdfExports(args);
    expect(rpcMock).toHaveBeenCalledWith('admin_list_contract_pdf_exports', args);
  });

  it('adminContractPdfExportsSummary calls RPC with no args', async () => {
    rpcMock.mockResolvedValueOnce({ data: [], error: null });
    await adminContractPdfExportsSummary();
    expect(rpcMock).toHaveBeenCalledWith('admin_contract_pdf_exports_summary');
  });
});