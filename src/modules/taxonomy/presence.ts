/**
 * Phase 18d — Taxonomy presence helpers for readiness / growth UIs.
 *
 * Returns per-business booleans + counts derived from
 * `business_taxonomy_categories` (joined with `taxonomy_categories`).
 * Callers use these to STOP reading the legacy `businesses.sectors` /
 * `businesses.sub_services` arrays for display and scoring.
 *
 * Shape:
 *   {
 *     hasPrimary:     true if any link with role = 'primary_activity' /
 *                     is_primary = true exists (i.e. taxonomy "sectors" ok),
 *     secondaryCount: number of secondary / entity_type / other non-service links,
 *     serviceCount:   number of links with role = 'service'.
 *   }
 *
 * Re-uses the same query as `useBusinessTaxonomyDisplayBatch` so the
 * React-Query cache is shared (one network call serves both display
 * labels and presence stats for the same id set).
 */
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface BusinessTaxonomyPresence {
  hasPrimary: boolean;
  secondaryCount: number;
  serviceCount: number;
}

export const EMPTY_TAXONOMY_PRESENCE: BusinessTaxonomyPresence = {
  hasPrimary: false,
  secondaryCount: 0,
  serviceCount: 0,
};

interface RawPresenceRow {
  business_id: string;
  role: string | null;
  is_primary: boolean | null;
}

export function buildPresenceMap(
  rows: RawPresenceRow[],
): Map<string, BusinessTaxonomyPresence> {
  const out = new Map<string, BusinessTaxonomyPresence>();
  for (const row of rows) {
    const cur = out.get(row.business_id) ?? { ...EMPTY_TAXONOMY_PRESENCE };
    const isPrimary =
      row.is_primary === true ||
      row.role === 'primary_activity' ||
      row.role === 'entity_type';
    if (isPrimary) cur.hasPrimary = true;
    else if (row.role === 'service') cur.serviceCount += 1;
    else cur.secondaryCount += 1;
    out.set(row.business_id, cur);
  }
  return out;
}

export function useBusinessTaxonomyPresenceBatch(businessIds: string[]) {
  const sortedKey = [...new Set(businessIds.filter(Boolean))].sort().join(',');
  return useQuery<Map<string, BusinessTaxonomyPresence>>({
    queryKey: ['business-taxonomy-presence-batch', sortedKey],
    enabled: sortedKey.length > 0,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    queryFn: async () => {
      const ids = sortedKey.split(',').filter(Boolean);
      if (ids.length === 0) return new Map();
      const { data, error } = await supabase
        .from('business_taxonomy_categories')
        .select('business_id, role, is_primary')
        .in('business_id', ids);
      if (error) throw error;
      return buildPresenceMap((data ?? []) as RawPresenceRow[]);
    },
  });
}

export function useBusinessTaxonomyPresence(
  businessId: string | null | undefined,
): BusinessTaxonomyPresence {
  const ids = useMemo(() => (businessId ? [businessId] : []), [businessId]);
  const { data } = useBusinessTaxonomyPresenceBatch(ids);
  if (!businessId || !data) return EMPTY_TAXONOMY_PRESENCE;
  return data.get(businessId) ?? EMPTY_TAXONOMY_PRESENCE;
}