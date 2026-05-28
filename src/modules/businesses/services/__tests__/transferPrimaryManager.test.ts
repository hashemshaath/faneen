import { describe, it, expect, vi, beforeEach } from 'vitest';

const rpcMock = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { rpc: (...args: unknown[]) => rpcMock(...args) },
}));

import { transferPrimaryManager } from '../transferPrimaryManager';

beforeEach(() => rpcMock.mockReset());

describe('transferPrimaryManager', () => {
  it('calls the transfer_primary_manager RPC with snake_case params', async () => {
    rpcMock.mockResolvedValueOnce({ data: { ok: true, code: 'primary_manager_transferred' }, error: null });
    await transferPrimaryManager({ businessId: 'b1', toUserId: 'u2', reason: 'why' });
    expect(rpcMock).toHaveBeenCalledTimes(1);
    expect(rpcMock).toHaveBeenCalledWith('transfer_primary_manager', {
      _business_id: 'b1',
      _to_user_id: 'u2',
      _reason: 'why',
    });
  });

  it('defaults reason to null', async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: null });
    await transferPrimaryManager({ businessId: 'b1', toUserId: 'u2' });
    expect(rpcMock.mock.calls[0][1]).toEqual({
      _business_id: 'b1',
      _to_user_id: 'u2',
      _reason: null,
    });
  });

  it('returns the raw envelope and does not throw on PostgREST error', async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: { message: 'denied' } });
    const res = await transferPrimaryManager({ businessId: 'b1', toUserId: 'u2' });
    expect(res.data).toBeNull();
    expect(res.error).toEqual({ message: 'denied' });
  });

  it('passes through ok=false envelope unchanged', async () => {
    rpcMock.mockResolvedValueOnce({ data: { ok: false, code: 'forbidden' }, error: null });
    const res = await transferPrimaryManager({ businessId: 'b1', toUserId: 'u2' });
    expect(res.data).toEqual({ ok: false, code: 'forbidden' });
    expect(res.error).toBeNull();
  });
});
