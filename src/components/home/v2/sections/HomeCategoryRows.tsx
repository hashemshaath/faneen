/**
 * Wrapper that renders the full set of HomeCategoryRow entries.
 * Kept as a single lazy chunk so the page doesn't ship 7 separate
 * dynamic imports — the data is tiny and the component is purely
 * presentational.
 */
import { useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import HomeCategoryRow from './HomeCategoryRow';
import { HOME_CATEGORY_ROWS, getCategoryRowTaxonomySlugs } from '../data/categoryRows';
import { listPublicBusinessesByTaxonomySlugs, type PublicTaxonomyBusiness } from '@/modules/taxonomy/search-integration';

const HOME_ROW_PROVIDER_LIMIT = 6;

const HomeCategoryRows = () => {
  const rowSlugs = useMemo(
    () => HOME_CATEGORY_ROWS.map((row) => ({ rowId: row.id, slugs: getCategoryRowTaxonomySlugs(row) })),
    [],
  );
  const allSlugs = useMemo(
    () => Array.from(new Set(rowSlugs.flatMap((entry) => entry.slugs))),
    [rowSlugs],
  );

  const queryClient = useQueryClient();
  const queryKey = useMemo(
    () => ['home-category-row-businesses', allSlugs.join('|')] as const,
    [allSlugs],
  );

  const { data: businessesBySlug = {}, isLoading } = useQuery({
    queryKey,
    enabled: allSlugs.length > 0,
    // Shorter window so transient empty/error states recover quickly.
    // Errors now throw (see search-integration.ts) and React Query will
    // retry automatically instead of caching an empty map.
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 4000),
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    queryFn: () => listPublicBusinessesByTaxonomySlugs(allSlugs, HOME_ROW_PROVIDER_LIMIT),
  });

  // Realtime: invalidate every public-directory dependency that can change
  // row visibility, grouping, logos, ratings, or city labels without reloads.
  useEffect(() => {
    const invalidateHomeRows = () => queryClient.invalidateQueries({ queryKey });
    const tables = ['business_taxonomy_categories', 'businesses', 'taxonomy_categories', 'cities'] as const;
    let channel = supabase.channel('home-category-rows-sync');
    for (const table of tables) {
      channel = channel.on(
        'postgres_changes' as unknown as 'system',
        { event: '*', schema: 'public', table } as never,
        invalidateHomeRows,
      );
    }
    channel.subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient, queryKey]);

  const providersByRow = useMemo(() => {
    const out = new Map<string, PublicTaxonomyBusiness[]>();
    for (const entry of rowSlugs) {
      const seen = new Set<string>();
      const providers: PublicTaxonomyBusiness[] = [];
      for (const slug of entry.slugs) {
        for (const business of businessesBySlug[slug] ?? []) {
          if (seen.has(business.id)) continue;
          seen.add(business.id);
          providers.push(business);
          if (providers.length >= HOME_ROW_PROVIDER_LIMIT) break;
        }
        if (providers.length >= HOME_ROW_PROVIDER_LIMIT) break;
      }
      out.set(entry.rowId, providers);
    }
    return out;
  }, [businessesBySlug, rowSlugs]);

  return (
    <div>
      {HOME_CATEGORY_ROWS.map((row) => (
        <HomeCategoryRow
          key={row.id}
          row={row}
          providers={providersByRow.get(row.id) ?? []}
          providersLoading={isLoading}
        />
      ))}
    </div>
  );
};

export default HomeCategoryRows;