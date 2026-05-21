import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface CategoryPublicCount {
  category_id: string;
  slug: string;
  name_ar: string;
  name_en: string;
  parent_id: string | null;
  providers_count: number;
  services_count: number;
  active_services_count: number;
}

export interface CategoryCountsMaps {
  rows: CategoryPublicCount[];
  byId: Map<string, CategoryPublicCount>;
  bySlug: Map<string, CategoryPublicCount>;
}

/**
 * Public-safe per-category counts (providers + services) sourced from the
 * `category_public_counts` view, which itself reads from `businesses_public`
 * so demo/draft/unpublished providers are naturally excluded.
 * Parent categories include direct children in their counts.
 */
export const useCategoryCounts = () => {
  const query = useQuery({
    queryKey: ['category-public-counts'],
    queryFn: async (): Promise<CategoryPublicCount[]> => {
      const { data, error } = await supabase
        .from('category_public_counts' as never)
        .select('*');
      if (error) throw error;
      return (data ?? []) as unknown as CategoryPublicCount[];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const maps = useMemo<CategoryCountsMaps>(() => {
    const rows = query.data ?? [];
    const byId = new Map<string, CategoryPublicCount>();
    const bySlug = new Map<string, CategoryPublicCount>();
    for (const row of rows) {
      byId.set(row.category_id, row);
      bySlug.set(row.slug, row);
    }
    return { rows, byId, bySlug };
  }, [query.data]);

  return { ...query, ...maps };
};