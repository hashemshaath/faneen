import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

type Builder = {
  update: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  in: ReturnType<typeof vi.fn>;
  then: (fn: (v: unknown) => unknown) => Promise<unknown>;
};

function makeBuilder(result: { data: unknown; error: unknown }): Builder {
  const b: Record<string, unknown> = {};
  const chain = () => b as unknown as Builder;
  b.update = vi.fn(chain);
  b.eq = vi.fn(chain);
  b.in = vi.fn(chain);
  b.then = (onFulfilled: (v: unknown) => unknown) =>
    Promise.resolve(result).then(onFulfilled);
  return b as unknown as Builder;
}

let builder: Builder;
const fromMock = vi.fn((_t: string) => builder);

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (t: string) => fromMock(t) },
}));

import { updateProfile } from '../updateProfile';
import { updateProfileById } from '../updateProfileById';
import { updateProfilesByIds } from '../updateProfilesByIds';

beforeEach(() => {
  fromMock.mockClear();
  builder = makeBuilder({ data: null, error: null });
});

describe('updateProfile', () => {
  it("from('profiles').update(values).eq('user_id', userId)", async () => {
    const values = { full_name: 'A', phone: '+9665', email: 'a@b.c', avatar_url: 'x' };
    await updateProfile({ userId: 'u1', values });
    expect(fromMock).toHaveBeenCalledWith('profiles');
    expect(builder.update).toHaveBeenCalledWith(values);
    expect(builder.eq).toHaveBeenCalledWith('user_id', 'u1');
  });
  it('does not transform values', async () => {
    const values = { avatar_url: '   spaced   ', email: 'A@B.com' };
    await updateProfile({ userId: 'u1', values });
    expect(builder.update).toHaveBeenCalledWith(values);
  });
  it('passes through { data, error }', async () => {
    builder = makeBuilder({ data: null, error: { message: 'rls' } });
    const r = await updateProfile({ userId: 'u', values: { avatar_url: 'x' } });
    expect(r).toEqual({ data: null, error: { message: 'rls' } });
  });
});

describe('updateProfileById', () => {
  it("from('profiles').update(values).eq('id', id)", async () => {
    await updateProfileById({ id: 'p1', values: { is_banned: true } });
    expect(fromMock).toHaveBeenCalledWith('profiles');
    expect(builder.update).toHaveBeenCalledWith({ is_banned: true });
    expect(builder.eq).toHaveBeenCalledWith('id', 'p1');
  });
  it('passes through error shape', async () => {
    builder = makeBuilder({ data: null, error: { message: 'denied' } });
    const r = await updateProfileById({ id: 'p1', values: { is_banned: false } });
    expect(r).toEqual({ data: null, error: { message: 'denied' } });
  });
});

describe('updateProfilesByIds', () => {
  it("from('profiles').update(values).in('id', ids)", async () => {
    await updateProfilesByIds({ ids: ['p1', 'p2'], values: { is_banned: true } });
    expect(fromMock).toHaveBeenCalledWith('profiles');
    expect(builder.update).toHaveBeenCalledWith({ is_banned: true });
    expect(builder.in).toHaveBeenCalledWith('id', ['p1', 'p2']);
  });
  it('does not short-circuit on empty ids (preserves underlying behavior)', async () => {
    await updateProfilesByIds({ ids: [], values: { is_banned: false } });
    expect(fromMock).toHaveBeenCalledWith('profiles');
    expect(builder.in).toHaveBeenCalledWith('id', []);
  });
});

describe('migration regression: AdminUsers', () => {
  const src = readFileSync(resolve(__dirname, '../../../../pages/admin/AdminUsers.tsx'), 'utf8');
  it('no longer contains direct supabase.from("profiles") calls', () => {
    expect(src).not.toMatch(/supabase\.from\(['"]profiles['"]\)/);
  });
  it('imports listProfiles + updateProfileById + updateProfilesByIds from @/modules/users', () => {
    expect(src).toMatch(/from '@\/modules\/users'/);
    expect(src).toMatch(/listProfiles/);
    expect(src).toMatch(/updateProfileById/);
    expect(src).toMatch(/updateProfilesByIds/);
  });
});

describe('migration regression: DashboardSettings', () => {
  const src = readFileSync(resolve(__dirname, '../../../../pages/dashboard/DashboardSettings.tsx'), 'utf8');
  it('no longer contains direct supabase.from("profiles") calls', () => {
    expect(src).not.toMatch(/supabase\.from\(['"]profiles['"]\)/);
  });
  it('imports updateProfile from @/modules/users', () => {
    expect(src).toMatch(/updateProfile\b/);
    expect(src).toMatch(/from '@\/modules\/users'/);
  });
});

describe('migration regression: DashboardLayout', () => {
  const src = readFileSync(resolve(__dirname, '../../../../components/dashboard/DashboardLayout.tsx'), 'utf8');
  it('no longer contains direct supabase.from("profiles") calls', () => {
    expect(src).not.toMatch(/supabase\.from\(['"]profiles['"]\)/);
  });
  it('imports updateProfile from @/modules/users', () => {
    expect(src).toMatch(/updateProfile\b/);
    expect(src).toMatch(/from '@\/modules\/users'/);
  });
});