import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: vi.fn(), rpc: vi.fn() },
}));

import { supabase } from '@/integrations/supabase/client';
import {
  listAllUserRoles,
  listUserRolesFor,
  grantRole,
  revokeRoleById,
  revokeRoleByUserAndRole,
} from '../userRoles';

interface ChainBuilder {
  calls: Array<[string, unknown[]]>;
  select: Mock;
  insert: Mock;
  delete: Mock;
  eq: Mock;
  then: (resolve: (v: { data: unknown; error: unknown }) => unknown) => Promise<unknown>;
}

function makeBuilder(response: { data: unknown; error: unknown }): ChainBuilder {
  const builder = { calls: [] as Array<[string, unknown[]]> } as ChainBuilder;
  const track = (name: string) =>
    vi.fn((...args: unknown[]) => {
      builder.calls.push([name, args]);
      return builder;
    });
  builder.select = track('select');
  builder.insert = track('insert');
  builder.delete = track('delete');
  builder.eq = track('eq');
  builder.then = (resolve) => Promise.resolve(response).then(resolve);
  return builder;
}

const fromMock = supabase.from as unknown as Mock;

beforeEach(() => {
  fromMock.mockReset();
});

describe('listAllUserRoles', () => {
  it('maps rows on success', async () => {
    const rows = [{ id: 'r1', user_id: 'u1', role: 'admin' }];
    const b = makeBuilder({ data: rows, error: null });
    fromMock.mockReturnValue(b);
    const out = await listAllUserRoles();
    expect(fromMock).toHaveBeenCalledWith('user_roles');
    expect(b.select).toHaveBeenCalledWith('id, user_id, role');
    expect(out).toEqual(rows);
  });

  it('returns [] on read error', async () => {
    fromMock.mockReturnValue(makeBuilder({ data: null, error: { code: '42501', message: 'permission denied' } }));
    expect(await listAllUserRoles()).toEqual([]);
  });
});

describe('listUserRolesFor', () => {
  it('applies eq(user_id, userId)', async () => {
    const b = makeBuilder({ data: [], error: null });
    fromMock.mockReturnValue(b);
    await listUserRolesFor('user-123');
    expect(b.eq).toHaveBeenCalledWith('user_id', 'user-123');
  });

  it('returns [] for empty userId without querying', async () => {
    expect(await listUserRolesFor('')).toEqual([]);
    expect(fromMock).not.toHaveBeenCalled();
  });
});

describe('grantRole', () => {
  it('resolves on success', async () => {
    const b = makeBuilder({ data: null, error: null });
    fromMock.mockReturnValue(b);
    await expect(grantRole('u1', 'admin')).resolves.toBeUndefined();
    expect(b.insert).toHaveBeenCalledWith({ user_id: 'u1', role: 'admin' });
  });

  it('rejects duplicate with normalized.code = DUPLICATE_KEY', async () => {
    fromMock.mockReturnValue(
      makeBuilder({ data: null, error: { code: '23505', message: 'duplicate key value violates unique constraint' } })
    );
    await expect(grantRole('u1', 'admin')).rejects.toMatchObject({
      normalized: { code: 'DUPLICATE_KEY' },
    });
  });
});

describe('revokeRoleById', () => {
  it('resolves on success', async () => {
    const b = makeBuilder({ data: null, error: null });
    fromMock.mockReturnValue(b);
    await expect(revokeRoleById('row-1')).resolves.toBeUndefined();
    expect(b.delete).toHaveBeenCalled();
    expect(b.eq).toHaveBeenCalledWith('id', 'row-1');
  });

  it('rejects RLS denial with normalized.code = RLS_DENIED', async () => {
    fromMock.mockReturnValue(
      makeBuilder({ data: null, error: { code: '42501', message: 'permission denied' } })
    );
    await expect(revokeRoleById('row-1')).rejects.toMatchObject({
      normalized: { code: 'RLS_DENIED' },
    });
  });
});

describe('revokeRoleByUserAndRole', () => {
  it('applies composite eq chain', async () => {
    const b = makeBuilder({ data: null, error: null });
    fromMock.mockReturnValue(b);
    await revokeRoleByUserAndRole('u1', 'admin');
    expect(b.delete).toHaveBeenCalled();
    expect(b.eq).toHaveBeenNthCalledWith(1, 'user_id', 'u1');
    expect(b.eq).toHaveBeenNthCalledWith(2, 'role', 'admin');
  });
});
