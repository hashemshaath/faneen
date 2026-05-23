import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

type Builder = {
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
  then: (resolve: (v: { data: unknown; error: unknown }) => unknown) => Promise<unknown>;
};

function makeBuilder(result: { data: unknown; error: unknown }): Builder {
  const b: Record<string, unknown> = {};
  const chain = () => b as unknown as Builder;
  b.select = vi.fn(chain);
  b.eq = vi.fn(chain);
  b.order = vi.fn(chain);
  b.limit = vi.fn(chain);
  // Thenable so `await query` resolves to the result.
  b.then = (onFulfilled: (v: typeof result) => unknown) =>
    Promise.resolve(result).then(onFulfilled);
  return b as unknown as Builder;
}

let builder: Builder;
const fromMock = vi.fn((_t: string) => builder);

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (t: string) => fromMock(t) },
}));

import { listOwnerBusinesses } from '../listOwnerBusinesses';

beforeEach(() => {
  fromMock.mockClear();
  builder = makeBuilder({ data: [{ id: 'b1' }], error: null });
});

describe('listOwnerBusinesses', () => {
  it("default: from('businesses').select('id').eq('user_id', userId) — no order/limit/active", async () => {
    await listOwnerBusinesses({ userId: 'u1' });
    expect(fromMock).toHaveBeenCalledWith('businesses');
    expect(builder.select).toHaveBeenCalledWith('id');
    expect(builder.eq).toHaveBeenCalledWith('user_id', 'u1');
    expect(builder.eq).toHaveBeenCalledTimes(1);
    expect(builder.order).not.toHaveBeenCalled();
    expect(builder.limit).not.toHaveBeenCalled();
  });

  it('honors custom select', async () => {
    await listOwnerBusinesses({ userId: 'u1', select: 'id, name_ar, name_en' });
    expect(builder.select).toHaveBeenCalledWith('id, name_ar, name_en');
  });

  it('applies activeOnly as eq("is_active", true)', async () => {
    await listOwnerBusinesses({ userId: 'u1', activeOnly: true });
    expect(builder.eq).toHaveBeenCalledWith('user_id', 'u1');
    expect(builder.eq).toHaveBeenCalledWith('is_active', true);
  });

  it('applies orderBy with default ascending true', async () => {
    await listOwnerBusinesses({ userId: 'u1', orderBy: { column: 'created_at' } });
    expect(builder.order).toHaveBeenCalledWith('created_at', { ascending: true });
  });

  it('applies orderBy with ascending false', async () => {
    await listOwnerBusinesses({ userId: 'u1', orderBy: { column: 'created_at', ascending: false } });
    expect(builder.order).toHaveBeenCalledWith('created_at', { ascending: false });
  });

  it('applies limit when provided', async () => {
    await listOwnerBusinesses({ userId: 'u1', limit: 1 });
    expect(builder.limit).toHaveBeenCalledWith(1);
  });

  it('passes through { data, error } shape', async () => {
    builder = makeBuilder({ data: null, error: { message: 'boom' } });
    const r = await listOwnerBusinesses({ userId: 'u1' });
    expect(r).toEqual({ data: null, error: { message: 'boom' } });
  });

  it('returns array data unmodified', async () => {
    builder = makeBuilder({ data: [{ id: 'a' }, { id: 'b' }], error: null });
    const r = await listOwnerBusinesses<{ id: string }>({ userId: 'u1' });
    expect(r.data).toEqual([{ id: 'a' }, { id: 'b' }]);
  });
});

// ─── P-18 migration regression locks ───────────────────
const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf-8');

describe('P-18 owner-list migration', () => {
  it('DashboardBadge owner list uses listOwnerBusinesses + staff .in via listBusinessesByIds; merge/dedup preserved', () => {
    const src = read('src/pages/dashboard/DashboardBadge.tsx');
    expect(src).toContain('listOwnerBusinesses');
    expect(src).toContain('listBusinessesByIds');
    // No direct owner list or .in('id', ...) remain.
    expect(src).not.toMatch(/supabase[\s\S]{0,40}\.from\(['"]businesses['"]\)[\s\S]*?eq\(['"]user_id['"]/);
    expect(src).not.toMatch(/supabase[\s\S]{0,40}\.from\(['"]businesses['"]\)[\s\S]*?\.in\(['"]id['"]/);
    expect(src).toContain("'id, username, name_ar, name_en, is_verified'");
    expect(src).toContain("['badge-generator-businesses', user?.id]");
    expect(src).toContain('enabled: !!user?.id');
    // Merge + dedup logic untouched.
    expect(src).toContain('const merged = [...((owned ?? []) as BusinessRow[]), ...staffBusinesses];');
    expect(src).toContain('seen.has(b.id)');
    // business_staff direct read intentionally deferred.
    expect(src).toMatch(/from\(['"]business_staff['"]\)/);
  });

  it('DashboardPrivateSectors owner list uses listOwnerBusinesses', () => {
    const src = read('src/pages/dashboard/DashboardPrivateSectors.tsx');
    expect(src).toContain('listOwnerBusinesses');
    expect(src).not.toMatch(/supabase[\s\S]{0,40}\.from\(['"]businesses['"]\)[\s\S]*?eq\(['"]user_id['"]/);
    expect(src).toContain("'id, name_ar, name_en'");
    expect(src).toContain("['my-businesses-for-sectors', user?.id]");
    expect(src).toContain('enabled: !!user');
    // business_staff embedded read intentionally deferred.
    expect(src).toMatch(/from\(['"]business_staff['"]\)/);
  });

  it('ProviderServiceAreas owner list uses listOwnerBusinesses', () => {
    const src = read('src/pages/dashboard/ProviderServiceAreas.tsx');
    expect(src).toContain('listOwnerBusinesses');
    expect(src).not.toMatch(/supabase[\s\S]{0,40}\.from\(['"]businesses['"]\)[\s\S]*?eq\(['"]user_id['"]/);
    expect(src).toContain("'id, name_ar'");
    expect(src).toContain("['my-businesses', user?.id]");
    expect(src).toContain('enabled: !!user');
  });

  it('Membership owner list-style uses listOwnerBusinesses; preserves owned.data[0] semantics', () => {
    const src = read('src/pages/Membership.tsx');
    expect(src).toContain('listOwnerBusinesses');
    expect(src).not.toMatch(/supabase[\s\S]{0,40}\.from\(['"]businesses['"]\)[\s\S]*?eq\(['"]user_id['"]/);
    expect(src).toContain(
      "'id, ref_id, membership_tier, name_ar, name_en, approval_status, onboarding_completion, approval_notes'",
    );
    expect(src).toContain("['my-business-membership', user?.id, profile?.account_type]");
    expect(src).toContain('owned.data[0]');
    // staff fallback still direct (embedded select).
    expect(src).toMatch(/from\(['"]business_staff['"]\)/);
  });
});

describe('P-18 deferred guardrails', () => {
  it('listManagedBusinessesForUser remains the canonical staff+owner aggregator (P-24 moved)', () => {
    const src = read('src/modules/businesses/services/listManagedBusinessesForUser.ts');
    expect(src).toMatch(/supabase\.from\(['"]businesses['"]\)/);
    expect(src).toMatch(/supabase\.from\(['"]business_staff['"]\)/);
  });
  it('leads getManagedBusinessesForUser delegates to canonical service', () => {
    const src = read('src/modules/leads/services/getManagedBusinessesForUser.ts');
    expect(src).toContain('listManagedBusinessesForUser');
    expect(src).not.toMatch(/supabase\.from\(/);
  });
});

// ─── P-23 allowlist burn-down regression locks ─────────
describe('P-23 allowlist burn-down', () => {
  it('ActiveBusinessSwitcher owner read goes through listOwnerBusinesses', () => {
    const src = read('src/components/dashboard/ActiveBusinessSwitcher.tsx');
    expect(src).toContain('listOwnerBusinesses');
    expect(src).not.toMatch(/supabase[\s\S]{0,40}\.from\(['"]businesses['"]\)[\s\S]{0,80}select/);
    expect(src).toContain("'id, name_ar, name_en'");
    expect(src).toContain("['my-businesses-switcher', user?.id]");
    // business_staff direct read intentionally deferred.
    expect(src).toMatch(/from\(['"]business_staff['"]\)/);
  });

  it('PublicSiteScan owner read goes through listOwnerBusinesses', () => {
    const src = read('src/pages/PublicSiteScan.tsx');
    expect(src).toContain('listOwnerBusinesses');
    expect(src).not.toMatch(/supabase[\s\S]{0,40}\.from\(['"]businesses['"]\)[\s\S]{0,80}select/);
    expect(src).toContain("'id, name_ar, name_en'");
    expect(src).toContain("['my-managed-businesses', user?.id]");
    expect(src).toMatch(/from\(['"]business_staff['"]\)/);
  });

  it('DashboardAnalytics owner business read goes through getOwnerBusiness with activeOnly', () => {
    const src = read('src/pages/dashboard/DashboardAnalytics.tsx');
    expect(src).toContain('getOwnerBusiness');
    expect(src).not.toMatch(/supabase[\s\S]{0,40}\.from\(['"]businesses['"]\)[\s\S]{0,80}select/);
    expect(src).toContain("'id, name_ar, name_en, created_at, rating_avg, rating_count'");
    expect(src).toContain('activeOnly: true');
    expect(src).toContain("['my-business', user?.id]");
  });

  it('DashboardContractAnalytics owner read goes through listOwnerBusinesses', () => {
    const src = read('src/pages/dashboard/DashboardContractAnalytics.tsx');
    expect(src).toContain('listOwnerBusinesses');
    expect(src).not.toMatch(/supabase[\s\S]{0,40}\.from\(['"]businesses['"]\)[\s\S]{0,80}select/);
    expect(src).toContain("'id, name_ar, name_en'");
    expect(src).toContain("['my-managed-businesses', user?.id]");
    expect(src).toMatch(/from\(['"]business_staff['"]\)/);
  });

  it('audit allowlist no longer includes the four P-23 migrated files nor the P-24 lead delegators', () => {
    const src = read('scripts/businesses-reads-isolation-audit.mjs');
    expect(src).not.toContain('DashboardAnalytics.tsx');
    expect(src).not.toContain('DashboardContractAnalytics.tsx');
    expect(src).not.toContain('PublicSiteScan.tsx');
    expect(src).not.toContain('ActiveBusinessSwitcher.tsx');
    // P-24: lead service delegators are removed from the allowlist.
    expect(src).not.toContain('getManagedBusinessesForUser.ts');
    expect(src).not.toContain('getBusinessesForMyRequests.ts');
    expect(src).not.toContain('getLeadProviderContactForEmail.ts');
    // ensure-business remains allowlisted.
    expect(src).toContain('src/lib/ensure-business.ts');
  });
});