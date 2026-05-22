import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

type Builder = {
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  in: ReturnType<typeof vi.fn>;
  _result: { data: unknown[] | null; error: unknown };
};

function makeBuilder(result: { data: unknown[] | null; error: unknown }): Builder {
  const b: Record<string, unknown> = { _result: result };
  const chain = () => b as unknown as Builder;
  b.select = vi.fn(chain);
  b.eq = vi.fn(chain);
  b.in = vi.fn(chain);
  // Thenable so `await builder` resolves to the result
  b.then = (onFulfilled: (v: unknown) => unknown) =>
    Promise.resolve(result).then(onFulfilled);
  return b as unknown as Builder;
}

const builders: Record<string, Builder> = {};
const fromMock = vi.fn((table: string) => builders[table]);

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (t: string) => fromMock(t) },
}));

import { getManagedBusinessesForUser } from '../getManagedBusinessesForUser';

beforeEach(() => {
  fromMock.mockClear();
  builders.businesses = makeBuilder({ data: [], error: null });
  builders.business_staff = makeBuilder({ data: [], error: null });
});

describe('getManagedBusinessesForUser (D4)', () => {
  it('queries exact tables: businesses and business_staff', async () => {
    await getManagedBusinessesForUser('u-1');
    expect(fromMock).toHaveBeenCalledWith('businesses');
    expect(fromMock).toHaveBeenCalledWith('business_staff');
  });

  it('uses exact select strings', async () => {
    await getManagedBusinessesForUser('u-1');
    expect(builders.businesses.select).toHaveBeenCalledWith('id, name_ar, name_en');
    expect(builders.business_staff.select).toHaveBeenCalledWith(
      'business_id, role, businesses:business_id(id, name_ar, name_en)',
    );
  });

  it('applies exact filters on owned businesses', async () => {
    await getManagedBusinessesForUser('u-42');
    expect(builders.businesses.eq).toHaveBeenCalledWith('user_id', 'u-42');
  });

  it('applies exact filters on business_staff (user_id, is_active, role in)', async () => {
    await getManagedBusinessesForUser('u-42');
    expect(builders.business_staff.eq).toHaveBeenCalledWith('user_id', 'u-42');
    expect(builders.business_staff.eq).toHaveBeenCalledWith('is_active', true);
    expect(builders.business_staff.in).toHaveBeenCalledWith('role', ['owner', 'manager']);
  });

  it('deduplicates by business id across owned and staff', async () => {
    builders.businesses = makeBuilder({
      data: [{ id: 'b1', name_ar: 'أ', name_en: 'A' }],
      error: null,
    });
    builders.business_staff = makeBuilder({
      data: [
        { business_id: 'b1', role: 'manager', businesses: { id: 'b1', name_ar: 'أ', name_en: 'A' } },
        { business_id: 'b2', role: 'owner', businesses: { id: 'b2', name_ar: 'ب', name_en: 'B' } },
      ],
      error: null,
    });
    const result = await getManagedBusinessesForUser('u-1');
    expect(result.map((b) => b.id).sort()).toEqual(['b1', 'b2']);
  });

  it('skips staff rows with no joined business', async () => {
    builders.business_staff = makeBuilder({
      data: [{ business_id: 'b3', role: 'owner', businesses: null }],
      error: null,
    });
    const result = await getManagedBusinessesForUser('u-1');
    expect(result).toEqual([]);
  });

  it('returns empty array when both queries return null data', async () => {
    builders.businesses = makeBuilder({ data: null, error: null });
    builders.business_staff = makeBuilder({ data: null, error: null });
    const result = await getManagedBusinessesForUser('u-1');
    expect(result).toEqual([]);
  });
});

describe('DashboardLeads.tsx regression (D4)', () => {
  const src = readFileSync(
    resolve(__dirname, '../../../../pages/dashboard/DashboardLeads.tsx'),
    'utf8',
  );

  it('no longer contains supabase.from("businesses")', () => {
    expect(src).not.toMatch(/supabase\.from\(\s*['"]businesses['"]\s*\)/);
  });

  it('no longer contains supabase.from("business_staff")', () => {
    expect(src).not.toMatch(/supabase\.from\(\s*['"]business_staff['"]\s*\)/);
  });

  it('uses getManagedBusinessesForUser service', () => {
    expect(src).toMatch(/getManagedBusinessesForUser\(/);
  });

  it('still uses notifyCustomerLeadUpdate (E1/E2 preserved)', () => {
    expect(src).toMatch(/notifyCustomerLeadUpdate\(/);
  });

  it('still uses createOrGetLeadConversation (E3 preserved)', () => {
    expect(src).toMatch(/createOrGetLeadConversation\(/);
  });

  it('no longer imports supabase client directly', () => {
    expect(src).not.toMatch(/from '@\/integrations\/supabase\/client'/);
  });

  it('preserves React Query key for managed businesses', () => {
    expect(src).toMatch(/['"]my-managed-businesses['"]/);
  });
});