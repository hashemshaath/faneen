import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the supabase client BEFORE importing the modules under test.
const mockFrom = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    rpc: vi.fn(),
  },
}));

import {
  getRuntimeLegacyMap,
  getRuntimeLegacyMapCached,
  clearRuntimeLegacyMapCache,
} from '@/modules/taxonomy/migration-services';
import { LEGACY_SECTOR_TO_TAXONOMY_SLUG } from '@/modules/taxonomy/legacy-mapping';

function mockMappingRows(rows: Array<{ legacy_slug: string; slug: string }>) {
  mockFrom.mockReturnValueOnce({
    select: () => ({
      eq: () => ({
        not: () =>
          Promise.resolve({
            data: rows.map((r) => ({
              legacy_slug: r.legacy_slug,
              mapping_status: 'mapped',
              taxonomy_category_id: 'x',
              taxonomy_categories: { slug: r.slug },
            })),
            error: null,
          }),
      }),
    }),
  });
}

describe('Phase 9 — taxonomy backfill & runtime mapping', () => {
  beforeEach(() => {
    mockFrom.mockReset();
    clearRuntimeLegacyMapCache();
  });

  it('runtime mapping overrides the static map for matching slugs', async () => {
    mockMappingRows([{ legacy_slug: 'aluminum', slug: 'override-target' }]);
    const map = await getRuntimeLegacyMap();
    expect(map.aluminum).toBe('override-target');
    // Untouched static entry remains.
    expect(map.steel).toBe(LEGACY_SECTOR_TO_TAXONOMY_SLUG.steel);
  });

  it('falls back to static map when the DB call throws', async () => {
    mockFrom.mockReturnValueOnce({
      select: () => ({
        eq: () => ({ not: () => Promise.reject(new Error('boom')) }),
      }),
    });
    const map = await getRuntimeLegacyMap();
    expect(map).toEqual({ ...LEGACY_SECTOR_TO_TAXONOMY_SLUG });
    expect(map.aluminum).toBe('aluminum-glass-facades');
    expect(map.steel).toBe('steel-metal-works');
  });

  it('cached helper reuses the first result within TTL', async () => {
    mockMappingRows([{ legacy_slug: 'aluminum', slug: 'first' }]);
    const a = await getRuntimeLegacyMapCached();
    // Second call should NOT trigger another mockFrom invocation.
    const b = await getRuntimeLegacyMapCached();
    expect(a.aluminum).toBe('first');
    expect(b.aluminum).toBe('first');
    expect(mockFrom).toHaveBeenCalledTimes(1);
  });

  it('force-refresh re-reads the registry', async () => {
    mockMappingRows([{ legacy_slug: 'aluminum', slug: 'first' }]);
    await getRuntimeLegacyMapCached();
    mockMappingRows([{ legacy_slug: 'aluminum', slug: 'second' }]);
    const fresh = await getRuntimeLegacyMapCached({ force: true });
    expect(fresh.aluminum).toBe('second');
    expect(mockFrom).toHaveBeenCalledTimes(2);
  });

  it('static fallback still resolves canonical sectors', () => {
    expect(LEGACY_SECTOR_TO_TAXONOMY_SLUG.aluminum).toBe('aluminum-glass-facades');
    expect(LEGACY_SECTOR_TO_TAXONOMY_SLUG.steel).toBe('steel-metal-works');
  });
});