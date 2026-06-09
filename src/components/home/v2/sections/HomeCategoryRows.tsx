/**
 * Wrapper that renders the full set of HomeCategoryRow entries.
 * Kept as a single lazy chunk so the page doesn't ship 7 separate
 * dynamic imports — the data is tiny and the component is purely
 * presentational.
 */
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
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

  const { data: businessesBySlug = {}, isLoading } = useQuery({
    queryKey: ['home-category-row-businesses', allSlugs.join('|')],
    enabled: allSlugs.length > 0,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    queryFn: () => listPublicBusinessesByTaxonomySlugs(allSlugs, HOME_ROW_PROVIDER_LIMIT),
  });

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