import { describe, expect, it, vi, beforeEach } from 'vitest';

const rpcMock = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { rpc: (...args: unknown[]) => rpcMock(...args) },
}));

import { adminSearchUsersForTransfer } from '../adminSearchUsersForTransfer';

beforeEach(() => rpcMock.mockReset());

describe('adminSearchUsersForTransfer wrapper', () => {
  it('calls admin_search_users_for_transfer with _query + _limit and returns the raw envelope', async () => {
    const envelope = { data: [{ user_id: 'u1' }], error: null };
    rpcMock.mockResolvedValue(envelope);
    const out = await adminSearchUsersForTransfer({ query: 'omar', limit: 8 });
    expect(rpcMock).toHaveBeenCalledWith('admin_search_users_for_transfer', {
      _query: 'omar',
      _limit: 8,
    });
    expect(out).toBe(envelope);
  });

  it('defaults the limit to 10 when omitted', async () => {
    rpcMock.mockResolvedValue({ data: [], error: null });
    await adminSearchUsersForTransfer({ query: 'ab' });
    expect(rpcMock).toHaveBeenCalledWith('admin_search_users_for_transfer', {
      _query: 'ab',
      _limit: 10,
    });
  });

  it('passes RPC errors through without throwing', async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: 'forbidden' } });
    await expect(adminSearchUsersForTransfer({ query: 'xx' })).resolves.toMatchObject({
      error: { message: 'forbidden' },
    });
  });
});