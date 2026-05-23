import { describe, it, expect, vi, beforeEach } from 'vitest';

const rpcMock = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: (...args: unknown[]) => rpcMock(...args),
  },
}));

import { recordContractPdfExportRpc } from '../pdfExports';

beforeEach(() => {
  rpcMock.mockReset();
});

describe('CT-12 recordContractPdfExportRpc', () => {
  it('calls exact RPC name with exact params', async () => {
    rpcMock.mockResolvedValueOnce({ data: { export_id: 'x' }, error: null });
    const args = { _contract_id: 'c1', _source: 'contract_detail', _export_locale: 'ar' };
    const r = await recordContractPdfExportRpc(args);
    expect(rpcMock).toHaveBeenCalledWith('record_contract_pdf_export', args);
    expect(r).toEqual({ data: { export_id: 'x' }, error: null });
  });

  it('passes null locale through', async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: null });
    await recordContractPdfExportRpc({ _contract_id: 'c2', _source: 'unknown', _export_locale: null });
    expect(rpcMock).toHaveBeenCalledWith('record_contract_pdf_export', {
      _contract_id: 'c2', _source: 'unknown', _export_locale: null,
    });
  });

  it('surfaces RPC errors raw', async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: { message: 'denied' } });
    const r = await recordContractPdfExportRpc({ _contract_id: 'c3', _source: 'admin', _export_locale: null });
    expect(r.error).toEqual({ message: 'denied' });
  });

  it('bubbles thrown errors', async () => {
    rpcMock.mockRejectedValueOnce(new Error('boom'));
    await expect(
      recordContractPdfExportRpc({ _contract_id: 'c4', _source: 'admin', _export_locale: null }),
    ).rejects.toThrow('boom');
  });
});
