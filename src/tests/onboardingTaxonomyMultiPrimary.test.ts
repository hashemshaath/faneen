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
const rpcMock = vi.fn(async () => ({ data: null, error: null }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: rpcMock,
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({ data: [], error: null })),
      })),
    })),
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
      // @ts-expect-error — intentionally exercising runtime guard
      primaryActivityCategoryIds: ['pri-1', null, 42, '', 'pri-2'],
      // @ts-expect-error — runtime guard
      secondaryActivityCategoryIds: [null, 'sec-a', undefined, '', 'sec-b'],
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
  it('never references `category_id`, `sector_slug`, `sectors` or `sub_services` writes', () => {
    for (const f of FILES) {
      const src = readFileSync(f, 'utf8');
      // No legacy write targets in these files.
      expect(src).not.toMatch(/category_id\s*:/);
      expect(src).not.toMatch(/sector_slug/);
      expect(src).not.toMatch(/sub_services/);
      // Only the v2 RPC is allowed in these files.
      expect(src).not.toMatch(/set_business_taxonomy_categories\b(?!_v2)/);
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