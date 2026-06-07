/**
 * Phase 15 — Sector pages are taxonomy-first.
 *
 * Given a legacy sector slug (the value in the URL `/sectors/:slug`),
 * resolve the corresponding central taxonomy category and the set of
 * provider business ids linked to it via `business_taxonomy_categories`.
 *
 * Sector pages call this once and then:
 *   - overlay `taxonomyCategory` over their legacy `SECTORS_SEO` /
 *     `SECTOR_KEYWORDS` meta when SEO-visible, so the central taxonomy
 *     wins for title / description / keywords.
 *   - filter the public businesses query by `id in businessIds` instead
 *     of `category_id in [...]` against the legacy `categories` table.
 *
 * Keeping legacy URL slugs (`aluminum`, `steel`, `wood`, `glass`,
 * `stainless-steel`, `fabrication-installation`) working is handled by
 * `LEGACY_SECTOR_TO_TAXONOMY_SLUG`.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { LEGACY_SECTOR_TO_TAXONOMY_SLUG } from '@/modules/taxonomy';
import { getTaxonomyBusinessIdsForCategory } from '@/modules/taxonomy/search-integration';

export interface SectorTaxonomyCategory {
  id: string;
  slug: string;
  name_ar: string | null;
  name_en: string | null;
  short_description_ar: string | null;
  short_description_en: string | null;
  seo_title_ar: string | null;
  seo_title_en: string | null;
  seo_description_ar: string | null;
  seo_description_en: string | null;
  keywords_ar: string[] | null;
  keywords_en: string[] | null;
  show_in_seo: boolean | null;
}

export interface UseSectorTaxonomyResult {
  taxonomyCategory: SectorTaxonomyCategory | null;
  businessIds: string[];
  isLoading: boolean;
  /** True only when taxonomy was resolved AND yielded zero linked businesses. */
  hasEmptyTaxonomy: boolean;
}

/** Map a legacy sector slug to the taxonomy slug we should query for. */
export function resolveSectorTaxonomySlug(sectorSlug: string | null | undefined): string | null {
  if (!sectorSlug) return null;
  const norm = String(sectorSlug).trim().toLowerCase();
  if (!norm) return null;
  return LEGACY_SECTOR_TO_TAXONOMY_SLUG[norm] ?? norm;
}

export function useSectorTaxonomy(
  sectorSlug: string | null | undefined,
): UseSectorTaxonomyResult {
  const taxonomySlug = resolveSectorTaxonomySlug(sectorSlug);

  const { data: taxonomyCategory = null, isLoading: catLoading } = useQuery({
    queryKey: ['sector-taxonomy-resolve', taxonomySlug],
    enabled: !!taxonomySlug,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<SectorTaxonomyCategory | null> => {
      const { data } = await supabase
        .from('taxonomy_categories')
        .select(
          'id, slug, name_ar, name_en, short_description_ar, short_description_en, seo_title_ar, seo_title_en, seo_description_ar, seo_description_en, keywords_ar, keywords_en, show_in_seo, is_public, is_active, is_archived',
        )
        .eq('slug', taxonomySlug as string)
        .eq('is_active', true)
        .eq('is_public', true)
        .eq('is_archived', false)
        .maybeSingle();
      if (!data) return null;
      return data as unknown as SectorTaxonomyCategory;
    },
  });

  const { data: businessIds = [], isLoading: bizIdsLoading } = useQuery({
    queryKey: ['sector-taxonomy-business-ids', taxonomyCategory?.id],
    enabled: !!taxonomyCategory?.id,
    staleTime: 60 * 1000,
    queryFn: async () => {
      if (!taxonomyCategory?.id) return [] as string[];
      return await getTaxonomyBusinessIdsForCategory(taxonomyCategory.id);
    },
  });

  return {
    taxonomyCategory,
    businessIds,
    isLoading: catLoading || bizIdsLoading,
    hasEmptyTaxonomy: !!taxonomyCategory?.id && businessIds.length === 0,
  };
}