/**
 * Safe Batch 2 — guards multi-primary onboarding taxonomy behaviour.
 *
 * Validates the pure pieces that don't need React rendering:
 *   - normalizeOnboardingTaxonomyDraft (back-compat shim)
 *   - MultiPrimaryTaxonomyValue/EMPTY shape
 *   - business-services payload type targets the v2 RPC
 *
 * Also smoke-loads the components to make sure they compile and only
 * touch `business_taxonomy_categories` (no legacy field writes).
 */
import { describe, it, expect, vi } from 'vitest';
import {
  normalizeOnboardingTaxonomyDraft,
  EMPTY_ONBOARDING_TAXONOMY,
} from '@/modules/taxonomy/components/OnboardingTaxonomyStep';
import {
  EMPTY_MULTI_PRIMARY_TAXONOMY,
} from '@/modules/taxonomy/components/MultiPrimaryTaxonomyPicker';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// ─────────────── Supabase RPC mock (records calls) ───────────────
const { rpcMock } = vi.hoisted(() => ({
  rpcMock: vi.fn(async () => ({ data: null, error: null })),
}));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: rpcMock,
    from: vi.fn((table: string) => {
      // Chainable query stub. Tracks the last `.in('id', ids)` call so the
      // taxonomy validation pre-flight inside setBusinessTaxonomyCategoriesV2
      // sees rows for every primary/secondary id the test passes in.
      let lastIds: string[] = [];
      const chain: Record<string, unknown> = {};
      const passthrough = () => chain;
      const inFn = (_col: string, ids: string[]) => {
        lastIds = Array.isArray(ids) ? ids : [];
        return chain;
      };
      const resolveResult = () => {
        if (table === 'taxonomy_categories') {
          // Treat every queried id as a valid primary_activity row.
          const data = lastIds.map((id) => ({
            id,
            is_active: true,
            is_public: true,
            is_archived: false,
            parent_id: null,
            taxonomy_types: { code: 'primary_activity' },
          }));
          return { data, error: null };
        }
        return { data: [] as unknown[], error: null };
      };
      Object.assign(chain, {
        select: passthrough,
        eq: passthrough,
        in: inFn,
        order: passthrough,
        limit: passthrough,
        maybeSingle: () => Promise.resolve(resolveResult()),
        single: () => Promise.resolve(resolveResult()),
        then: (onFulfilled: (v: ReturnType<typeof resolveResult>) => unknown) =>
          Promise.resolve(onFulfilled(resolveResult())),
      });
      return chain;
    }),
  },
}));

describe('Safe Batch 2 — onboarding multi-primary shim', () => {
  it('exposes an empty shape with array of primaries', () => {
    expect(EMPTY_ONBOARDING_TAXONOMY).toEqual({
      entityTypeCategoryId: null,
      primaryActivityCategoryIds: [],
      secondaryActivityCategoryIds: [],
    });
    expect(EMPTY_MULTI_PRIMARY_TAXONOMY).toEqual(EMPTY_ONBOARDING_TAXONOMY);
  });

  it('converts legacy `primaryActivityCategoryId` (single) into array', () => {
    const normalized = normalizeOnboardingTaxonomyDraft({
      entityTypeCategoryId: 'et-1',
      primaryActivityCategoryId: 'pri-1',
      secondaryActivityCategoryIds: ['sec-a', 'sec-b'],
    });
    expect(normalized).toEqual({
      entityTypeCategoryId: 'et-1',
      primaryActivityCategoryIds: ['pri-1'],
      secondaryActivityCategoryIds: ['sec-a', 'sec-b'],
    });
  });

  it('keeps new `primaryActivityCategoryIds` and de-dupes against legacy', () => {
    const normalized = normalizeOnboardingTaxonomyDraft({
      entityTypeCategoryId: null,
      primaryActivityCategoryIds: ['pri-1', 'pri-2'],
      primaryActivityCategoryId: 'pri-1', // duplicate
      secondaryActivityCategoryIds: ['sec-a'],
    });
    expect(normalized.primaryActivityCategoryIds).toEqual(['pri-1', 'pri-2']);
    expect(normalized.secondaryActivityCategoryIds).toEqual(['sec-a']);
  });

  it('handles missing / null / non-object inputs safely', () => {
    expect(normalizeOnboardingTaxonomyDraft(null)).toEqual(EMPTY_ONBOARDING_TAXONOMY);
    expect(normalizeOnboardingTaxonomyDraft(undefined)).toEqual(EMPTY_ONBOARDING_TAXONOMY);
    expect(normalizeOnboardingTaxonomyDraft({})).toEqual(EMPTY_ONBOARDING_TAXONOMY);
  });

  it('strips non-string entries from arrays', () => {
    const normalized = normalizeOnboardingTaxonomyDraft({
      primaryActivityCategoryIds: ['pri-1', null as unknown as string, 42 as unknown as string, '', 'pri-2'],
      secondaryActivityCategoryIds: [null as unknown as string, 'sec-a', undefined as unknown as string, '', 'sec-b'],
    });
    expect(normalized.primaryActivityCategoryIds).toEqual(['pri-1', 'pri-2']);
    expect(normalized.secondaryActivityCategoryIds).toEqual(['sec-a', 'sec-b']);
  });
});

describe('Safe Batch 2 — taxonomy persistence calls the v2 RPC', () => {
  it('setBusinessTaxonomyCategoriesV2 routes to the v2 RPC with arrays', async () => {
    const { setBusinessTaxonomyCategoriesV2 } = await import('@/modules/taxonomy/business-services');
    rpcMock.mockClear();
    await setBusinessTaxonomyCategoriesV2('biz-1', {
      entityTypeCategoryId: 'et-1',
      primaryActivityCategoryIds: ['pri-1', 'pri-2'],
      secondaryActivityCategoryIds: ['sec-a', 'sec-b'],
    });
    expect(rpcMock).toHaveBeenCalledWith('set_business_taxonomy_categories_v2', {
      p_business_id: 'biz-1',
      p_entity_type_category_id: 'et-1',
      p_primary_activity_category_ids: ['pri-1', 'pri-2'],
      p_secondary_activity_category_ids: ['sec-a', 'sec-b'],
    });
  });
});

describe('Safe Batch 2 — no legacy field writes from taxonomy components', () => {
  const SRC = (p: string) => resolve(process.cwd(), p);
  const FILES = [
    SRC('src/modules/taxonomy/components/OnboardingTaxonomyStep.tsx'),
    SRC('src/modules/taxonomy/components/BusinessTaxonomySection.tsx'),
    SRC('src/modules/taxonomy/components/MultiPrimaryTaxonomyPicker.tsx'),
  ];
  it('never writes to legacy fields (sector_slug, sectors, sub_services, businesses.category_id)', () => {
    for (const f of FILES) {
      const src = readFileSync(f, 'utf8');
      // No legacy write targets in these files (comments stripped).
      const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/.*$/gm, '');
      expect(code).not.toMatch(/sector_slug/);
      expect(code).not.toMatch(/['"]sub_services['"]/);
      expect(code).not.toMatch(/from\(['"]businesses['"]\)/);
      // Only the v2 RPC is allowed in these files.
      expect(code).not.toMatch(/set_business_taxonomy_categories\b(?!_v2)/);
    }
  });

  it('uses business_taxonomy_categories as the storage target', () => {
    const services = readFileSync(
      SRC('src/modules/taxonomy/business-services.ts'),
      'utf8',
    );
    expect(services).toContain("from('business_taxonomy_categories')");
    expect(services).toContain('set_business_taxonomy_categories_v2');
  });
});

describe('Safe Batch 2 — onboarding payload contract', () => {
  it('Onboarding.tsx invokes setBusinessTaxonomyCategoriesV2 with the array payload', () => {
    const SRC = (p: string) => resolve(process.cwd(), p);
    const src = readFileSync(SRC('src/pages/Onboarding.tsx'), 'utf8');
    expect(src).toMatch(/setBusinessTaxonomyCategoriesV2\(/);
    expect(src).toMatch(/primaryActivityCategoryIds:\s*taxonomy\.primaryActivityCategoryIds/);
    // Must not call the legacy single-primary helper.
    expect(src).not.toMatch(/setBusinessTaxonomyCategories\(/);
  });
});