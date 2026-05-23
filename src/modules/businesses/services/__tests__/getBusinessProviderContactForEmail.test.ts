import { describe, it, expect, vi, beforeEach } from 'vitest';

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

import { getBusinessProviderContactForEmail } from '../getBusinessProviderContactForEmail';

beforeEach(() => {
  calls.length = 0;
  businessRow = null;
  profileRow = null;
});

describe('getBusinessProviderContactForEmail (P-24)', () => {
  it('queries businesses with exact select + eq(id) + maybeSingle', async () => {
    businessRow = { name_ar: 'شركة', name_en: 'Co', user_id: 'u1', email: 'b@x.com' };
    await getBusinessProviderContactForEmail({ businessId: 'biz-1' });
    const c = calls.find((x) => x.table === 'businesses');
    expect(c).toBeDefined();
    expect(c!.select).toBe('name_ar, name_en, user_id, email');
    expect(c!.eqCol).toBe('id');
    expect(c!.eqVal).toBe('biz-1');
    expect(c!.used).toBe('maybeSingle');
  });

  it('businessName uses name_ar when present, else name_en', async () => {
    businessRow = { name_ar: 'شركة', name_en: 'Co', user_id: 'u1', email: 'b@x.com' };
    expect((await getBusinessProviderContactForEmail({ businessId: 'b' })).businessName).toBe('شركة');
    businessRow = { name_ar: null, name_en: 'Co', user_id: 'u1', email: 'b@x.com' };
    expect((await getBusinessProviderContactForEmail({ businessId: 'b' })).businessName).toBe('Co');
  });

  it('returns business.email and does NOT call profiles when present', async () => {
    businessRow = { name_ar: 'a', name_en: null, user_id: 'u1', email: 'b@x.com' };
    const r = await getBusinessProviderContactForEmail({ businessId: 'b' });
    expect(r.providerEmail).toBe('b@x.com');
    expect(calls.find((c) => c.table === 'profiles')).toBeUndefined();
  });

  it('contractProviderUserId overrides business.user_id and is used for profiles fallback', async () => {
    businessRow = { name_ar: 'a', name_en: null, user_id: 'u-biz', email: null };
    profileRow = { email: 'p@x.com' };
    const r = await getBusinessProviderContactForEmail({
      businessId: 'b',
      contractProviderUserId: 'u-contract',
    });
    expect(r.providerUserId).toBe('u-contract');
    const prof = calls.find((c) => c.table === 'profiles');
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
    const r = await getBusinessProviderContactForEmail({ businessId: 'b' });
    expect(r.providerUserId).toBe('u-biz');
    expect(calls.find((c) => c.table === 'profiles')?.eqVal).toBe('u-biz');
    expect(r.providerEmail).toBe('p2@x.com');
  });

  it('skips profiles fallback when no providerUserId available', async () => {
    businessRow = { name_ar: 'a', name_en: null, user_id: null, email: null };
    const r = await getBusinessProviderContactForEmail({ businessId: 'b' });
    expect(r.providerEmail).toBeUndefined();
    expect(calls.find((c) => c.table === 'profiles')).toBeUndefined();
  });

  it('returns undefined providerEmail when neither source has email', async () => {
    businessRow = { name_ar: 'a', name_en: null, user_id: 'u1', email: null };
    profileRow = { email: null };
    expect((await getBusinessProviderContactForEmail({ businessId: 'b' })).providerEmail).toBeUndefined();
  });

  it('returns empty shape when business row is null', async () => {
    businessRow = null;
    expect(await getBusinessProviderContactForEmail({ businessId: 'missing' })).toEqual({
      businessName: undefined,
      providerEmail: undefined,
      providerUserId: undefined,
    });
  });
});