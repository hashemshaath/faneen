import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

/**
 * Verifies that `useBusinesses` filters out inactive / expired joined rows at
 * the Supabase query level — so badges in `BusinessCard` never render from
 * data the UI shouldn't have received in the first place.
 */

type Call = { fn: string; args: unknown[] };
const calls: Call[] = [];

const builder = {
  select: vi.fn((..._args: unknown[]) => { calls.push({ fn: 'select', args: _args }); return builder; }),
  eq: vi.fn((..._args: unknown[]) => { calls.push({ fn: 'eq', args: _args }); return builder; }),
  or: vi.fn((..._args: unknown[]) => { calls.push({ fn: 'or', args: _args }); return builder; }),
  order: vi.fn((..._args: unknown[]) => { calls.push({ fn: 'order', args: _args }); return builder; }),
  limit: vi.fn((..._args: unknown[]) => {
    calls.push({ fn: 'limit', args: _args });
    return Promise.resolve({ data: [], error: null });
  }),
};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: vi.fn(() => builder) },
}));

import { useBusinesses } from './useSearch';
import { supabase } from '@/integrations/supabase/client';

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return React.createElement(QueryClientProvider, { client: qc }, children);
};

beforeEach(() => {
  calls.length = 0;
  vi.clearAllMocks();
});

describe('useBusinesses Supabase query', () => {
  it('queries businesses_public and filters out inactive joined data', async () => {
    const { result } = renderHook(() => useBusinesses(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(supabase.from).toHaveBeenCalledWith('businesses_public');

    // Top-level filter: is_active = true
    const eqCalls = calls.filter((c) => c.fn === 'eq').map((c) => c.args);
    expect(eqCalls).toEqual(
      expect.arrayContaining([
        ['is_active', true],
        ['business_services.is_active', true],
        // SERVICE-ACTIVATION-GOVERNANCE-3 — triple-gate eligibility:
        // legacy is_active + provider_status + admin_status must align
        // before a nested service is treated as public.
        ['business_services.provider_status', 'active'],
        ['business_services.admin_status', 'allowed'],
        ['promotions.is_active', true],
      ]),
    );

    // Promotions end_date guarded with .or(... , { foreignTable: 'promotions' })
    const orCall = calls.find((c) => c.fn === 'or');
    expect(orCall).toBeDefined();
    const [orFilter, orOpts] = orCall!.args as [string, { foreignTable?: string }];
    expect(orFilter).toMatch(/end_date\.is\.null/);
    expect(orFilter).toMatch(/end_date\.gte\.\d{4}-\d{2}-\d{2}/);
    expect(orOpts).toEqual({ foreignTable: 'promotions' });

    // Selected projection includes only the columns the badges need
    const selectArg = (calls.find((c) => c.fn === 'select')!.args[0] as string);
    // PERF-1D.1 — parent select is now an explicit allow-list, not `*`.
    expect(selectArg.startsWith('*')).toBe(false);
    expect(selectArg).not.toMatch(/^\*,/);
    for (const col of [
      'id', 'username', 'name_ar', 'name_en', 'description_ar', 'description_en',
      'logo_url', 'cover_url', 'website',
      'rating_avg', 'rating_count', 'is_verified', 'membership_tier',
      'category_id', 'city_id', 'latitude', 'longitude', 'created_at',
    ]) {
      expect(selectArg).toContain(col);
    }
    // Confirm trimmed columns are gone — guards regressions that would
    // silently widen the public read surface again.
    for (const col of [
      'business_number', 'ref_id', 'country_id',
      'short_description_ar', 'short_description_en',
      'address', 'district', 'region', 'street_name', 'updated_at',
    ]) {
      expect(selectArg).not.toMatch(new RegExp(`\\b${col}\\b`));
    }
    expect(selectArg).toContain(
      'business_services(name_ar, name_en, price_from, price_to, is_active, provider_status, admin_status, category_id)',
    );
    expect(selectArg).toContain('promotions(id, end_date)');
    expect(selectArg).toContain('categories(id, name_ar, name_en, slug, icon, parent_id)');
    // No greedy "promotions(*)" or "business_services(*)" patterns
    expect(selectArg).not.toMatch(/promotions\(\*\)/);
    expect(selectArg).not.toMatch(/business_services\(\*\)/);

    // Sorted + capped at 500
    expect(calls.find((c) => c.fn === 'order')!.args).toEqual(['rating_avg', { ascending: false }]);
    expect(calls.find((c) => c.fn === 'limit')!.args).toEqual([500]);
  });

  it('uses today (UTC, YYYY-MM-DD) as the end_date lower bound', async () => {
    const { result } = renderHook(() => useBusinesses(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const todayUtc = new Date().toISOString().slice(0, 10);
    const orFilter = (calls.find((c) => c.fn === 'or')!.args[0] as string);
    expect(orFilter).toContain(`end_date.gte.${todayUtc}`);
  });
});