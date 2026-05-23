import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: vi.fn(), rpc: vi.fn() },
}));

import { supabase } from '@/integrations/supabase/client';
import {
  getUserRoles,
  hasRole,
  hasAdminAccess,
  hasSuperAdminAccess,
  listAllUserRoles,
  listUserRolesFor,
  countByRole,
} from '../reads';

interface Builder {
  select: Mock; eq: Mock;
  then: (r: (v: { data: unknown; error: unknown }) => unknown) => Promise<unknown>;
}

function makeBuilder(response: { data: unknown; error: unknown }): Builder {
  const b = {} as Builder;
  b.select = vi.fn(() => b);
  b.eq = vi.fn(() => b);
  b.then = (resolve) => Promise.resolve(response).then(resolve);
  return b;
}

const fromMock = supabase.from as unknown as Mock;
const rpcMock = supabase.rpc as unknown as Mock;

beforeEach(() => {
  fromMock.mockReset();
  rpcMock.mockReset();
});

describe('ID-2 identity role reads', () => {
  it('getUserRoles: empty userId short-circuits to []', async () => {
    expect(await getUserRoles('')).toEqual([]);
    expect(fromMock).not.toHaveBeenCalled();
  });

  it('getUserRoles: maps role rows', async () => {
    const b = makeBuilder({ data: [{ role: 'admin' }, { role: 'user' }], error: null });
    fromMock.mockReturnValue(b);
    const out = await getUserRoles('u1');
    expect(fromMock).toHaveBeenCalledWith('user_roles');
    expect(b.select).toHaveBeenCalledWith('role');
    expect(b.eq).toHaveBeenCalledWith('user_id', 'u1');
    expect(out).toEqual(['admin', 'user']);
  });

  it('getUserRoles: returns [] on error', async () => {
    fromMock.mockReturnValue(makeBuilder({ data: null, error: { code: '42501', message: 'denied' } }));
    expect(await getUserRoles('u1')).toEqual([]);
  });

  it('hasRole: empty userId returns false without calling RPC', async () => {
    expect(await hasRole('', 'admin')).toBe(false);
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it('hasRole: calls has_role with exact params and returns boolean', async () => {
    rpcMock.mockResolvedValueOnce({ data: true, error: null });
    const out = await hasRole('u1', 'admin');
    expect(rpcMock).toHaveBeenCalledWith('has_role', { _user_id: 'u1', _role: 'admin' });
    expect(out).toBe(true);
  });

  it('hasRole: returns false on RPC error', async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: { code: '42501', message: 'denied' } });
    expect(await hasRole('u1', 'admin')).toBe(false);
  });

  it('hasAdminAccess: true if either admin or super_admin', async () => {
    rpcMock
      .mockResolvedValueOnce({ data: false, error: null })
      .mockResolvedValueOnce({ data: true, error: null });
    expect(await hasAdminAccess('u1')).toBe(true);
  });

  it('hasSuperAdminAccess: delegates to has_role super_admin', async () => {
    rpcMock.mockResolvedValueOnce({ data: true, error: null });
    expect(await hasSuperAdminAccess('u1')).toBe(true);
    expect(rpcMock).toHaveBeenCalledWith('has_role', { _user_id: 'u1', _role: 'super_admin' });
  });

  it('listAllUserRoles: selects id, user_id, role', async () => {
    const rows = [{ id: 'r1', user_id: 'u1', role: 'admin' }];
    const b = makeBuilder({ data: rows, error: null });
    fromMock.mockReturnValue(b);
    expect(await listAllUserRoles()).toEqual(rows);
    expect(fromMock).toHaveBeenCalledWith('user_roles');
    expect(b.select).toHaveBeenCalledWith('id, user_id, role');
  });

  it('listUserRolesFor: empty userId short-circuits to []', async () => {
    expect(await listUserRolesFor('')).toEqual([]);
    expect(fromMock).not.toHaveBeenCalled();
  });

  it('listUserRolesFor: filters by user_id', async () => {
    const b = makeBuilder({ data: [], error: null });
    fromMock.mockReturnValue(b);
    await listUserRolesFor('u1');
    expect(b.eq).toHaveBeenCalledWith('user_id', 'u1');
  });

  it('countByRole: tallies role counts with all 4 keys present (zeros)', async () => {
    const b = makeBuilder({
      data: [{ role: 'admin' }, { role: 'admin' }, { role: 'user' }],
      error: null,
    });
    fromMock.mockReturnValue(b);
    const out = await countByRole();
    expect(b.select).toHaveBeenCalledWith('role');
    expect(out).toEqual({ admin: 2, super_admin: 0, user: 1, moderator: 0 });
  });

  it('countByRole: zero map on error', async () => {
    fromMock.mockReturnValue(makeBuilder({ data: null, error: { code: '42501', message: 'denied' } }));
    expect(await countByRole()).toEqual({ admin: 0, super_admin: 0, user: 0, moderator: 0 });
  });
});

describe('ID-2 legacy shim re-exports', () => {
  it('src/services/userRoles re-exports read functions from identity', async () => {
    const legacy = await import('@/services/userRoles');
    const identity = await import('@/modules/identity');
    for (const k of [
      'getUserRoles', 'hasRole', 'hasAdminAccess', 'hasSuperAdminAccess',
      'listAllUserRoles', 'listUserRolesFor', 'countByRole',
    ] as const) {
      expect(legacy[k]).toBe(identity[k]);
    }
  });
});