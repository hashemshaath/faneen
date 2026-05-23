import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: vi.fn(), rpc: vi.fn() },
}));

import { supabase } from '@/integrations/supabase/client';
import { grantRole, revokeRoleById, revokeRoleByUserAndRole } from '../mutations';

interface ChainBuilder {
  insert: Mock;
  delete: Mock;
  eq: Mock;
  then: (resolve: (v: { data: unknown; error: unknown }) => unknown) => Promise<unknown>;
}

function makeBuilder(response: { data: unknown; error: unknown }): ChainBuilder {
  const b = {} as ChainBuilder;
  const track = () => vi.fn(() => b);
  b.insert = track();
  b.delete = track();
  b.eq = track();
  b.then = (resolve) => Promise.resolve(response).then(resolve);
  return b;
}

const fromMock = supabase.from as unknown as Mock;

beforeEach(() => fromMock.mockReset());

describe('grantRole', () => {
  it('uses user_roles table with exact insert payload', async () => {
    const b = makeBuilder({ data: null, error: null });
    fromMock.mockReturnValue(b);
    await grantRole('u1', 'admin');
    expect(fromMock).toHaveBeenCalledWith('user_roles');
    expect(b.insert).toHaveBeenCalledWith({ user_id: 'u1', role: 'admin' });
  });

  it('rejects with normalized DUPLICATE_KEY on 23505', async () => {
    fromMock.mockReturnValue(makeBuilder({ data: null, error: { code: '23505', message: 'dup' } }));
    await expect(grantRole('u1', 'admin')).rejects.toMatchObject({ normalized: { code: 'DUPLICATE_KEY' } });
  });
});

describe('revokeRoleById', () => {
  it('delete+eq(id,...)', async () => {
    const b = makeBuilder({ data: null, error: null });
    fromMock.mockReturnValue(b);
    await revokeRoleById('row-1');
    expect(fromMock).toHaveBeenCalledWith('user_roles');
    expect(b.delete).toHaveBeenCalled();
    expect(b.eq).toHaveBeenCalledWith('id', 'row-1');
  });

  it('rejects with RLS_DENIED on 42501', async () => {
    fromMock.mockReturnValue(makeBuilder({ data: null, error: { code: '42501', message: 'denied' } }));
    await expect(revokeRoleById('r')).rejects.toMatchObject({ normalized: { code: 'RLS_DENIED' } });
  });
});

describe('revokeRoleByUserAndRole', () => {
  it('delete+eq(user_id)+eq(role)', async () => {
    const b = makeBuilder({ data: null, error: null });
    fromMock.mockReturnValue(b);
    await revokeRoleByUserAndRole('u1', 'admin');
    expect(fromMock).toHaveBeenCalledWith('user_roles');
    expect(b.delete).toHaveBeenCalled();
    expect(b.eq).toHaveBeenNthCalledWith(1, 'user_id', 'u1');
    expect(b.eq).toHaveBeenNthCalledWith(2, 'role', 'admin');
  });
});