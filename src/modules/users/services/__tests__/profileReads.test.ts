import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

type Builder = {
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  in: ReturnType<typeof vi.fn>;
  maybeSingle: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
  then: (fn: (v: unknown) => unknown) => Promise<unknown>;
};

function makeBuilder(result: { data: unknown; error: unknown }): Builder {
  const b: Record<string, unknown> = {};
  const chain = () => b as unknown as Builder;
  b.select = vi.fn(chain);
  b.eq = vi.fn(chain);
  b.in = vi.fn(chain);
  b.maybeSingle = vi.fn(() => Promise.resolve(result));
  b.single = vi.fn(() => Promise.resolve(result));
  b.then = (onFulfilled: (v: unknown) => unknown) =>
    Promise.resolve(result).then(onFulfilled);
  return b as unknown as Builder;
}

let builder: Builder;
const fromMock = vi.fn((_t: string) => builder);

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (t: string) => fromMock(t) },
}));

import { listProfilesByUserIds } from '../listProfilesByUserIds';
import { getProfileByUserId } from '../getProfileByUserId';
import { getProfileForContractParty } from '../getProfileForContractParty';

beforeEach(() => {
  fromMock.mockClear();
  builder = makeBuilder({ data: [], error: null });
});

describe('listProfilesByUserIds', () => {
  it("from('profiles').select(default).in('user_id', ids)", async () => {
    await listProfilesByUserIds({ userIds: ['u1', 'u2'] });
    expect(fromMock).toHaveBeenCalledWith('profiles');
    expect(builder.select).toHaveBeenCalledWith('user_id, full_name, avatar_url');
    expect(builder.in).toHaveBeenCalledWith('user_id', ['u1', 'u2']);
  });
  it('honors custom select', async () => {
    await listProfilesByUserIds({ userIds: ['u1'], select: 'user_id, full_name, email, avatar_url, membership_tier' });
    expect(builder.select).toHaveBeenCalledWith('user_id, full_name, email, avatar_url, membership_tier');
  });
  it('empty userIds short-circuits without Supabase call', async () => {
    const r = await listProfilesByUserIds({ userIds: [] });
    expect(fromMock).not.toHaveBeenCalled();
    expect(r).toEqual({ data: [], error: null });
  });
  it('passes through { data, error } shape', async () => {
    builder = makeBuilder({ data: null, error: { message: 'rls' } });
    const r = await listProfilesByUserIds({ userIds: ['u1'] });
    expect(r).toEqual({ data: null, error: { message: 'rls' } });
  });
});

describe('getProfileByUserId', () => {
  it("default maybeSingle: from('profiles').select('*').eq('user_id', id).maybeSingle()", async () => {
    builder = makeBuilder({ data: { id: 'p1' }, error: null });
    await getProfileByUserId({ userId: 'u1' });
    expect(fromMock).toHaveBeenCalledWith('profiles');
    expect(builder.select).toHaveBeenCalledWith('*');
    expect(builder.eq).toHaveBeenCalledWith('user_id', 'u1');
    expect(builder.maybeSingle).toHaveBeenCalled();
    expect(builder.single).not.toHaveBeenCalled();
  });
  it('terminal:"single" uses .single()', async () => {
    builder = makeBuilder({ data: { id: 'p1' }, error: null });
    await getProfileByUserId({
      userId: 'u1',
      select: 'id, user_id, full_name',
      terminal: 'single',
    });
    expect(builder.select).toHaveBeenCalledWith('id, user_id, full_name');
    expect(builder.single).toHaveBeenCalled();
    expect(builder.maybeSingle).not.toHaveBeenCalled();
  });
  it('passes through { data, error } shape', async () => {
    builder = makeBuilder({ data: null, error: { message: 'no row' } });
    const r = await getProfileByUserId({ userId: 'u1', terminal: 'single' });
    expect(r).toEqual({ data: null, error: { message: 'no row' } });
  });
});

describe('getProfileForContractParty', () => {
  it('uses exact countries+cities join select with eq + maybeSingle', async () => {
    builder = makeBuilder({ data: { id: 'p1' }, error: null });
    await getProfileForContractParty({ userId: 'u1' });
    expect(fromMock).toHaveBeenCalledWith('profiles');
    expect(builder.select).toHaveBeenCalledWith(
      '*, countries(name_ar, name_en, currency_code), cities(name_ar, name_en)',
    );
    expect(builder.eq).toHaveBeenCalledWith('user_id', 'u1');
    expect(builder.maybeSingle).toHaveBeenCalled();
  });
});

// ─── P-5 migration regression locks ────────────────────
const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf-8');

describe('P-5 profile read migration', () => {
  it('ContractDetail uses getProfileForContractParty (no direct profiles read for party joins)', () => {
    const src = read('src/pages/ContractDetail.tsx');
    // No direct profiles join select for party lookup
    expect(src).not.toMatch(/supabase\.from\(['"]profiles['"]\)[\s\S]*?countries\(name_ar/);
    expect(src).toContain('getProfileForContractParty');
    // Query keys unchanged
    expect(src).toContain("['profile', contract?.client_id]");
    expect(src).toContain("['profile', contract?.provider_id]");
  });
  it('DashboardReviews uses listProfilesByUserIds', () => {
    const src = read('src/pages/dashboard/DashboardReviews.tsx');
    expect(src).not.toMatch(/supabase\.from\(['"]profiles['"]\)\.select\(['"]user_id, full_name, avatar_url['"]\)\.in/);
    expect(src).toContain('listProfilesByUserIds');
  });
  it('DashboardMessages uses listProfilesByUserIds (both calls)', () => {
    const src = read('src/pages/dashboard/DashboardMessages.tsx');
    expect(src).not.toMatch(/supabase\.from\(['"]profiles['"]\)/);
    const matches = src.match(/listProfilesByUserIds/g) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(2);
  });
  it('DashboardBookings uses listProfilesByUserIds (with phone field preserved)', () => {
    const src = read('src/pages/dashboard/DashboardBookings.tsx');
    expect(src).not.toMatch(/supabase\.from\(['"]profiles['"]\)/);
    expect(src).toContain('listProfilesByUserIds');
    expect(src).toContain("'user_id, full_name, phone, avatar_url'");
    expect(src).toContain("['booking-client-profiles', clientIds]");
  });
  it('AdminMemberships uses listProfilesByUserIds (membership_tier field preserved)', () => {
    const src = read('src/pages/admin/AdminMemberships.tsx');
    // AdminMemberships also reads businesses (out-of-scope, deferred); only profiles guard here.
    expect(src).not.toMatch(/supabase\.from\(['"]profiles['"]\)/);
    expect(src).toContain('listProfilesByUserIds');
    expect(src).toContain("'user_id, full_name, email, avatar_url, membership_tier'");
    expect(src).toContain("['admin-sub-profiles', userIds]");
  });
  it('AuthContext.fetchProfile uses getProfileByUserId with terminal:"single"', () => {
    const src = read('src/contexts/AuthContext.tsx');
    expect(src).not.toMatch(/from\(['"]profiles['"]\)/);
    expect(src).toContain('getProfileByUserId');
    expect(src).toContain("terminal: 'single'");
    // Full profile select preserved
    expect(src).toContain('id, user_id, full_name, phone, email, account_type, is_onboarded, phone_verified, country_code, avatar_url, account_number, ref_id, membership_tier');
  });
});

describe('P-5 out-of-scope guardrail (must remain direct in this phase)', () => {
  it('AdminUsers profile updates remain direct', () => {
    const src = read('src/pages/admin/AdminUsers.tsx');
    expect(src).toMatch(/supabase\.from\(['"]profiles['"]\)\.update/);
  });
  it('DashboardSettings profile update remains direct', () => {
    const src = read('src/pages/dashboard/DashboardSettings.tsx');
    expect(src).toMatch(/supabase\.from\(['"]profiles['"]\)\.update/);
  });
  it('DashboardLayout avatar update remains direct', () => {
    const src = read('src/components/dashboard/DashboardLayout.tsx');
    expect(src).toMatch(/supabase\.from\(['"]profiles['"]\)\.update/);
  });
  it('AdminDashboardView head-count / list reads remain direct (deferred)', () => {
    const src = read('src/pages/dashboard/overview/AdminDashboardView.tsx');
    expect(src).toMatch(/supabase\.from\(['"]profiles['"]\)/);
  });
  it('DashboardContracts email→user_id lookup remains direct (different filter shape)', () => {
    const src = read('src/pages/dashboard/DashboardContracts.tsx');
    expect(src).toMatch(/supabase\.from\(['"]profiles['"]\)\.select\(['"]user_id['"]\)\.eq\(['"]email['"]/);
  });
  it('About.tsx public head-count remains direct (deferred)', () => {
    const src = read('src/pages/About.tsx');
    expect(src).toMatch(/supabase\.from\(['"]profiles['"]\)/);
  });
});