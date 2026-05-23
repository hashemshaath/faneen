import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

type Builder = {
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
  maybeSingle: ReturnType<typeof vi.fn>;
};

function makeBuilder(result: { data: unknown; error: unknown }): Builder {
  const b: Record<string, unknown> = {};
  const chain = () => b as unknown as Builder;
  b.select = vi.fn(chain);
  b.eq = vi.fn(chain);
  b.order = vi.fn(chain);
  b.limit = vi.fn(chain);
  b.maybeSingle = vi.fn(() => Promise.resolve(result));
  return b as unknown as Builder;
}

let builder: Builder;
const fromMock = vi.fn((_t: string) => builder);

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (t: string) => fromMock(t) },
}));

import { getOwnerBusiness, getOwnerBusinessId } from '../getOwnerBusiness';
import { getActiveBusinessStaffMembership } from '../getActiveBusinessStaffMembership';

beforeEach(() => {
  fromMock.mockClear();
  builder = makeBuilder({ data: { id: 'b1' }, error: null });
});

describe('getOwnerBusiness', () => {
  it("default: from('businesses').select('id').eq('user_id', userId).maybeSingle()", async () => {
    await getOwnerBusiness({ userId: 'u1' });
    expect(fromMock).toHaveBeenCalledWith('businesses');
    expect(builder.select).toHaveBeenCalledWith('id');
    expect(builder.eq).toHaveBeenCalledWith('user_id', 'u1');
    expect(builder.eq).toHaveBeenCalledTimes(1);
    expect(builder.maybeSingle).toHaveBeenCalled();
    expect(builder.order).not.toHaveBeenCalled();
    expect(builder.limit).not.toHaveBeenCalled();
  });

  it('honors custom select', async () => {
    await getOwnerBusiness({ userId: 'u1', select: 'id, name_ar, name_en' });
    expect(builder.select).toHaveBeenCalledWith('id, name_ar, name_en');
  });

  it('applies activeOnly as eq("is_active", true)', async () => {
    await getOwnerBusiness({ userId: 'u1', activeOnly: true });
    expect(builder.eq).toHaveBeenCalledWith('user_id', 'u1');
    expect(builder.eq).toHaveBeenCalledWith('is_active', true);
  });

  it('applies orderBy with ascending default true', async () => {
    await getOwnerBusiness({ userId: 'u1', orderBy: { column: 'created_at' } });
    expect(builder.order).toHaveBeenCalledWith('created_at', { ascending: true });
  });

  it('applies limit when provided', async () => {
    await getOwnerBusiness({ userId: 'u1', limit: 1 });
    expect(builder.limit).toHaveBeenCalledWith(1);
  });

  it('passes through { data, error } shape', async () => {
    builder = makeBuilder({ data: null, error: { message: 'boom' } });
    const r = await getOwnerBusiness({ userId: 'u1' });
    expect(r).toEqual({ data: null, error: { message: 'boom' } });
  });
});

describe('getOwnerBusinessId', () => {
  it("equals getOwnerBusiness({userId, select:'id'}) — no limit/order/activeOnly", async () => {
    await getOwnerBusinessId('u9');
    expect(fromMock).toHaveBeenCalledWith('businesses');
    expect(builder.select).toHaveBeenCalledWith('id');
    expect(builder.eq).toHaveBeenCalledWith('user_id', 'u9');
    expect(builder.limit).not.toHaveBeenCalled();
    expect(builder.order).not.toHaveBeenCalled();
    expect(builder.maybeSingle).toHaveBeenCalled();
  });
});

describe('getActiveBusinessStaffMembership', () => {
  it("from('business_staff').select('id').eq('user_id').eq('is_active', true).limit(1).maybeSingle()", async () => {
    await getActiveBusinessStaffMembership({ userId: 'u1' });
    expect(fromMock).toHaveBeenCalledWith('business_staff');
    expect(builder.select).toHaveBeenCalledWith('id');
    expect(builder.eq).toHaveBeenCalledWith('user_id', 'u1');
    expect(builder.eq).toHaveBeenCalledWith('is_active', true);
    expect(builder.limit).toHaveBeenCalledWith(1);
    expect(builder.maybeSingle).toHaveBeenCalled();
  });

  it('honors custom select', async () => {
    await getActiveBusinessStaffMembership({ userId: 'u1', select: 'id, role, business_id' });
    expect(builder.select).toHaveBeenCalledWith('id, role, business_id');
  });

  it('passes through { data, error } shape', async () => {
    builder = makeBuilder({ data: null, error: { message: 'rls' } });
    const r = await getActiveBusinessStaffMembership({ userId: 'u1' });
    expect(r).toEqual({ data: null, error: { message: 'rls' } });
  });
});

// ─── Migration regression locks (P-4) ───────────────────
const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf-8');

const OWNER_BIZ_MIGRATED: Array<{ path: string; key: string }> = [
  { path: 'src/pages/dashboard/DashboardSettings.tsx', key: "['my-business-for-settings']" },
  { path: 'src/pages/dashboard/DashboardServices.tsx', key: "['my-business', user?.id]" },
  { path: 'src/pages/dashboard/DashboardReviews.tsx', key: "['my-business-for-reviews', user?.id]" },
  { path: 'src/pages/dashboard/DashboardProjects.tsx', key: "['my-business', user?.id]" },
  { path: 'src/pages/dashboard/DashboardPortfolio.tsx', key: "['my-business', user?.id]" },
  { path: 'src/pages/dashboard/DashboardBookings.tsx', key: "['my-business', user?.id]" },
  { path: 'src/pages/dashboard/DashboardContracts.tsx', key: "['my-business-id-contracts', user?.id]" },
  { path: 'src/pages/dashboard/overview/ProviderDashboardView.tsx', key: "['my-business', user?.id]" },
];

describe('P-4 owner-business migration', () => {
  for (const { path, key } of OWNER_BIZ_MIGRATED) {
    it(`${path} uses getOwnerBusiness (no direct businesses+user_id read)`, () => {
      const src = read(path);
      expect(src).not.toMatch(/supabase\.from\(['"]businesses['"]\)[\s\S]*?eq\(['"]user_id['"]/);
      expect(src).toContain('getOwnerBusiness');
      expect(src).toContain(key);
    });
  }
});

describe('P-4 auth + diagnostics migration', () => {
  it('AuthContext uses getOwnerBusiness + getActiveBusinessStaffMembership', () => {
    const src = read('src/contexts/AuthContext.tsx');
    expect(src).not.toMatch(/supabase\.from\(['"]businesses['"]\)[\s\S]*?eq\(['"]user_id['"]/);
    expect(src).not.toMatch(/supabase\.from\(['"]business_staff['"]\)/);
    expect(src).toContain('getOwnerBusiness');
    expect(src).toContain('getActiveBusinessStaffMembership');
    // Preserve provider-access combination semantics.
    expect(src).toContain('ownedBusiness?.id || staffMembership?.id');
  });
  it('DashboardAccountDiagnostics uses both wrappers', () => {
    const src = read('src/pages/dashboard/DashboardAccountDiagnostics.tsx');
    expect(src).not.toMatch(/supabase\.from\(['"]businesses['"]\)[\s\S]*?eq\(['"]user_id['"]/);
    expect(src).not.toMatch(/supabase\.from\(['"]business_staff['"]\)/);
    expect(src).toContain('getOwnerBusiness');
    expect(src).toContain('getActiveBusinessStaffMembership');
  });
});

describe('P-4 out-of-scope guardrail (must remain direct)', () => {
  // NOTE: AdminBusinesses update callsites migrated in P-12 to
  // updateBusinessById / updateBusinessesByIds. Regression lock lives in
  // updateBusinessesByIds.test.ts.
  it('RepresentativesSection staff CRUD remains direct', () => {
    const src = read('src/components/dashboard/business-edit/RepresentativesSection.tsx');
    expect(src).toMatch(/supabase\.from\(['"]business_staff['"]\)\.update/);
  });
  it('AdminUsers staff CRUD remains direct', () => {
    const src = read('src/pages/admin/AdminUsers.tsx');
    expect(src).toMatch(/supabase\.from\(['"]business_staff['"]\)/);
  });
  it('listManagedBusinessesForUser remains the canonical staff+owner aggregator (P-24)', () => {
    const src = read('src/modules/businesses/services/listManagedBusinessesForUser.ts');
    expect(src).toMatch(/supabase\.from\(['"]businesses['"]\)/);
    expect(src).toMatch(/supabase\.from\(['"]business_staff['"]\)/);
  });
});