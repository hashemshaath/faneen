import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

type Builder = {
  select: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  gte: ReturnType<typeof vi.fn>;
  lte: ReturnType<typeof vi.fn>;
  then: (fn: (v: unknown) => unknown) => Promise<unknown>;
};

function makeBuilder(result: { data: unknown; error: unknown; count?: number | null }): Builder {
  const b: Record<string, unknown> = {};
  const chain = () => b as unknown as Builder;
  b.select = vi.fn(chain);
  b.order = vi.fn(chain);
  b.limit = vi.fn(chain);
  b.eq = vi.fn(chain);
  b.gte = vi.fn(chain);
  b.lte = vi.fn(chain);
  b.then = (onFulfilled: (v: unknown) => unknown) =>
    Promise.resolve(result).then(onFulfilled);
  return b as unknown as Builder;
}

let builder: Builder;
const fromMock = vi.fn((_t: string) => builder);

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (t: string) => fromMock(t) },
}));

import { countProfiles } from '../countProfiles';
import { listProfiles } from '../listProfiles';

beforeEach(() => {
  fromMock.mockClear();
  builder = makeBuilder({ data: null, error: null, count: 42 });
});

describe('countProfiles', () => {
  it("default: from('profiles').select('id', { count: 'exact', head: true })", async () => {
    const r = await countProfiles();
    expect(fromMock).toHaveBeenCalledWith('profiles');
    expect(builder.select).toHaveBeenCalledWith('id', { count: 'exact', head: true });
    expect(r).toEqual({ data: null, error: null, count: 42 });
  });

  it('honors custom select', async () => {
    await countProfiles({ select: '*' });
    expect(builder.select).toHaveBeenCalledWith('*', { count: 'exact', head: true });
  });

  it('applies eq/gte/lte filters in order', async () => {
    await countProfiles({
      filters: [
        { column: 'created_at', op: 'gte', value: '2025-01-01' },
        { column: 'created_at', op: 'lte', value: '2025-12-31' },
        { column: 'is_banned', op: 'eq', value: false },
      ],
    });
    expect(builder.gte).toHaveBeenCalledWith('created_at', '2025-01-01');
    expect(builder.lte).toHaveBeenCalledWith('created_at', '2025-12-31');
    expect(builder.eq).toHaveBeenCalledWith('is_banned', false);
  });

  it('passes through { data, error, count } shape', async () => {
    builder = makeBuilder({ data: null, error: { message: 'rls' }, count: null });
    const r = await countProfiles();
    expect(r).toEqual({ data: null, error: { message: 'rls' }, count: null });
  });
});

describe('listProfiles', () => {
  beforeEach(() => {
    builder = makeBuilder({ data: [{ id: 'p1' }], error: null });
  });

  it("default: from('profiles').select('*') with no order/limit", async () => {
    await listProfiles();
    expect(fromMock).toHaveBeenCalledWith('profiles');
    expect(builder.select).toHaveBeenCalledWith('*');
    expect(builder.order).not.toHaveBeenCalled();
    expect(builder.limit).not.toHaveBeenCalled();
  });

  it('honors select + order desc + limit', async () => {
    await listProfiles({
      select: 'id, full_name, avatar_url, email, account_type, created_at',
      orderBy: { column: 'created_at', ascending: false },
      limit: 5,
    });
    expect(builder.select).toHaveBeenCalledWith('id, full_name, avatar_url, email, account_type, created_at');
    expect(builder.order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(builder.limit).toHaveBeenCalledWith(5);
  });

  it('orderBy default ascending = true', async () => {
    await listProfiles({ select: 'created_at', orderBy: { column: 'created_at' } });
    expect(builder.order).toHaveBeenCalledWith('created_at', { ascending: true });
  });

  it('passes through { data, error } shape', async () => {
    builder = makeBuilder({ data: null, error: { message: 'rls' } });
    const r = await listProfiles();
    expect(r).toEqual({ data: null, error: { message: 'rls' } });
  });
});

// ─── P-6 migration regression locks ─────────────────────
const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf-8');

describe('P-6 admin/public profile read migration', () => {
  it('AdminDashboardView no longer directly reads profiles; uses countProfiles + listProfiles', () => {
    const src = read('src/pages/dashboard/overview/AdminDashboardView.tsx');
    expect(src).not.toMatch(/supabase\.from\(['"]profiles['"]\)/);
    expect(src).toContain('countProfiles');
    expect(src).toContain('listProfiles');
    // Preserved selects/order/limit for recent users + user growth timeline
    expect(src).toContain("'id, full_name, avatar_url, email, account_type, created_at'");
    expect(src).toContain("limit: 5");
    expect(src).toContain("column: 'created_at', ascending: false");
    expect(src).toContain("column: 'created_at', ascending: true");
    // React Query key preserved
    expect(src).toContain("['admin-overview-stats']");
  });

  it('AdminActivityLog uses listProfiles (no direct profiles read)', () => {
    const src = read('src/pages/admin/AdminActivityLog.tsx');
    expect(src).not.toMatch(/supabase\.from\(['"]profiles['"]\)/);
    expect(src).toContain('listProfiles');
    expect(src).toContain("'user_id, full_name, email'");
    expect(src).toContain("['admin-profiles']");
  });

  it('AdminAccessManagement uses listProfiles (no direct profiles read)', () => {
    const src = read('src/pages/admin/AdminAccessManagement.tsx');
    expect(src).not.toMatch(/supabase\.from\(['"]profiles['"]\)/);
    expect(src).toContain('listProfiles');
    expect(src).toContain("'id, user_id, full_name, email, phone, avatar_url, ref_id, account_type, is_onboarded, phone_verified, membership_tier, created_at, is_banned'");
    expect(src).toContain("column: 'created_at', ascending: false");
    expect(src).toContain("['access-mgmt-profiles']");
  });

  it('About.tsx public head-count uses countProfiles (no direct profiles read)', () => {
    const src = read('src/pages/About.tsx');
    expect(src).not.toMatch(/supabase\.from\(['"]profiles['"]\)/);
    expect(src).toContain('countProfiles');
    expect(src).toContain("['about-stats']");
    // .count ?? 0 fallback preserved
    expect(src).toContain('users.count ?? 0');
  });
});

describe('P-6 out-of-scope guardrail (must remain direct in this phase)', () => {
  it('AdminUsers profile updates/list remain direct (read+mutation deferred)', () => {
    const src = read('src/pages/admin/AdminUsers.tsx');
    expect(src).toMatch(/supabase\.from\(['"]profiles['"]\)\.update/);
    // The AdminUsers full list read is deferred along with mutations.
    expect(src).toMatch(/supabase\.from\(['"]profiles['"]\)\.select\(['"]\*['"]\)/);
  });
  it('DashboardSettings profile update remains direct', () => {
    const src = read('src/pages/dashboard/DashboardSettings.tsx');
    expect(src).toMatch(/supabase\.from\(['"]profiles['"]\)\.update/);
  });
  it('DashboardLayout avatar update remains direct', () => {
    const src = read('src/components/dashboard/DashboardLayout.tsx');
    expect(src).toMatch(/supabase\.from\(['"]profiles['"]\)\.update/);
  });
});