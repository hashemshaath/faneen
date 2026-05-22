import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

type Row = Record<string, unknown> | null;

const calls: Array<{
  table: string;
  select: string;
  eqCol: string;
  eqVal: unknown;
  used: 'maybeSingle';
}> = [];

let businessRow: Row = null;
let profileRow: Row = null;

function makeBuilder(table: string) {
  const state = { select: '', eqCol: '', eqVal: undefined as unknown };
  const builder = {
    select(sel: string) { state.select = sel; return builder; },
    eq(col: string, val: unknown) { state.eqCol = col; state.eqVal = val; return builder; },
    async maybeSingle() {
      calls.push({ table, select: state.select, eqCol: state.eqCol, eqVal: state.eqVal, used: 'maybeSingle' });
      if (table === 'businesses') return { data: businessRow, error: null };
      if (table === 'profiles') return { data: profileRow, error: null };
      return { data: null, error: null };
    },
  };
  return builder;
}

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (table: string) => makeBuilder(table) },
}));

import { getLeadProviderContactForEmail } from '../getLeadProviderContactForEmail';

beforeEach(() => {
  calls.length = 0;
  businessRow = null;
  profileRow = null;
});

describe('getLeadProviderContactForEmail (D4)', () => {
  it('queries businesses with exact select + eq(id) + maybeSingle', async () => {
    businessRow = { name_ar: 'شركة', name_en: 'Co', user_id: 'u1', email: 'b@x.com' };
    await getLeadProviderContactForEmail({ businessId: 'biz-1' });
    const call = calls.find(c => c.table === 'businesses');
    expect(call).toBeDefined();
    expect(call!.select).toBe('name_ar, name_en, user_id, email');
    expect(call!.eqCol).toBe('id');
    expect(call!.eqVal).toBe('biz-1');
    expect(call!.used).toBe('maybeSingle');
  });

  it('returns businessName from name_ar when present', async () => {
    businessRow = { name_ar: 'شركة', name_en: 'Co', user_id: 'u1', email: 'b@x.com' };
    const r = await getLeadProviderContactForEmail({ businessId: 'biz-1' });
    expect(r.businessName).toBe('شركة');
  });

  it('falls back to name_en when name_ar missing', async () => {
    businessRow = { name_ar: null, name_en: 'Co', user_id: 'u1', email: 'b@x.com' };
    const r = await getLeadProviderContactForEmail({ businessId: 'biz-1' });
    expect(r.businessName).toBe('Co');
  });

  it('returns business.email as providerEmail without profiles fallback', async () => {
    businessRow = { name_ar: 'a', name_en: null, user_id: 'u1', email: 'b@x.com' };
    const r = await getLeadProviderContactForEmail({ businessId: 'biz-1' });
    expect(r.providerEmail).toBe('b@x.com');
    expect(calls.find(c => c.table === 'profiles')).toBeUndefined();
  });

  it('uses contractProviderUserId over business.user_id when given', async () => {
    businessRow = { name_ar: 'a', name_en: null, user_id: 'u-biz', email: null };
    profileRow = { email: 'p@x.com' };
    const r = await getLeadProviderContactForEmail({ businessId: 'biz-1', contractProviderUserId: 'u-contract' });
    expect(r.providerUserId).toBe('u-contract');
    const prof = calls.find(c => c.table === 'profiles');
    expect(prof).toBeDefined();
    expect(prof!.select).toBe('email');
    expect(prof!.eqCol).toBe('user_id');
    expect(prof!.eqVal).toBe('u-contract');
    expect(prof!.used).toBe('maybeSingle');
    expect(r.providerEmail).toBe('p@x.com');
  });

  it('falls back to business.user_id when contractProviderUserId not given', async () => {
    businessRow = { name_ar: 'a', name_en: null, user_id: 'u-biz', email: null };
    profileRow = { email: 'p2@x.com' };
    const r = await getLeadProviderContactForEmail({ businessId: 'biz-1' });
    expect(r.providerUserId).toBe('u-biz');
    expect(calls.find(c => c.table === 'profiles')?.eqVal).toBe('u-biz');
    expect(r.providerEmail).toBe('p2@x.com');
  });

  it('skips profiles fallback when no providerUserId available', async () => {
    businessRow = { name_ar: 'a', name_en: null, user_id: null, email: null };
    const r = await getLeadProviderContactForEmail({ businessId: 'biz-1' });
    expect(r.providerEmail).toBeUndefined();
    expect(calls.find(c => c.table === 'profiles')).toBeUndefined();
  });

  it('returns undefined providerEmail when neither business nor profile has email', async () => {
    businessRow = { name_ar: 'a', name_en: null, user_id: 'u1', email: null };
    profileRow = { email: null };
    const r = await getLeadProviderContactForEmail({ businessId: 'biz-1' });
    expect(r.providerEmail).toBeUndefined();
  });

  it('returns empty shape when business row is null', async () => {
    businessRow = null;
    const r = await getLeadProviderContactForEmail({ businessId: 'missing' });
    expect(r).toEqual({ businessName: undefined, providerEmail: undefined, providerUserId: undefined });
  });
});

describe('AdminLeadRequests.tsx regression (D4)', () => {
  const src = readFileSync(
    resolve(__dirname, '../../../../pages/admin/AdminLeadRequests.tsx'),
    'utf8',
  );

  it('no longer contains direct supabase.from("businesses")', () => {
    expect(src).not.toMatch(/supabase\.from\(\s*['"]businesses['"]/);
  });

  it('no longer contains direct supabase.from("profiles")', () => {
    expect(src).not.toMatch(/supabase\.from\(\s*['"]profiles['"]/);
  });

  it('uses getLeadProviderContactForEmail wrapper', () => {
    expect(src).toMatch(/getLeadProviderContactForEmail\(/);
  });

  it('still uses adminConvertLeadToContract', () => {
    expect(src).toMatch(/adminConvertLeadToContract\(/);
  });

  it('still uses sendLeadTransactionalEmail', () => {
    expect(src).toMatch(/sendLeadTransactionalEmail\(/);
  });

  it('preserves Promise.allSettled(sends) fail-soft behavior', () => {
    expect(src).toMatch(/await Promise\.allSettled\(sends\)/);
  });

  it('no longer imports supabase client (no remaining direct usages)', () => {
    expect(src).not.toMatch(/from '@\/integrations\/supabase\/client'/);
  });
});