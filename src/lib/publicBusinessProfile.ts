/**
 * PROFILE-AGGREGATE — Single-round-trip loader for the public
 * `/{username}` provider profile page.
 *
 * Replaces the previous 6+ parallel queries (business row, branches,
 * services, certifications, awards, promotions count) with one
 * `public.get_business_public_profile(p_slug)` RPC call. Consumers keep
 * using the existing per-collection hooks (`useServices`,
 * `useBranches`, `useCertifications`, `useAwards`, `useActivePromotionsCount`,
 * `useBusinessByUsername`) — this loader seeds their react-query caches
 * with `setQueryData`, so those hooks resolve synchronously without
 * hitting the network.
 *
 * Cache key `['public-business-profile', slug]` is explicitly namespaced
 * so it never collides with the dashboard keys stripped from the persist
 * allowlist in Pass-S.
 */
import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { normalizeUsername } from '@/lib/business/profileHref';

export interface PublicBusinessProfileAggregate {
  business: Record<string, unknown> | null;
  branches: unknown[];
  services: unknown[];
  certifications: unknown[];
  awards: unknown[];
  active_promotions_count: number;
}

export const PUBLIC_PROFILE_STALE_MS = 5 * 60 * 1000;

export function usePublicBusinessProfile(username: string | undefined) {
  const slug = normalizeUsername(username ?? '');
  const qc = useQueryClient();

  const query = useQuery<PublicBusinessProfileAggregate | null>({
    queryKey: ['public-business-profile', slug],
    enabled: !!slug,
    staleTime: PUBLIC_PROFILE_STALE_MS,
    gcTime: 24 * 60 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc(
        // Cast — the generated types are refreshed after this migration is
        // approved; this keeps the loader compiling in the meantime.
        'get_business_public_profile' as never,
        { p_slug: slug } as never,
      );
      if (error) {
        // eslint-disable-next-line no-console
        console.error('[public-business-profile] rpc failed', { slug, reason: error.message });
        throw error;
      }
      return (data as PublicBusinessProfileAggregate | null) ?? null;
    },
  });

  // Seed the per-collection caches used by BusinessProfile.tsx so their
  // hooks return synchronously from cache instead of triggering a fetch.
  useEffect(() => {
    const agg = query.data;
    if (!agg || !agg.business) return;
    const businessRow = agg.business as { id?: string; username?: string };
    const id = businessRow.id;
    if (!id) return;
    qc.setQueryData(['business', slug], businessRow);
    qc.setQueryData(['branches', id], agg.branches ?? []);
    qc.setQueryData(['services', id], agg.services ?? []);
    qc.setQueryData(['business-certifications', id], agg.certifications ?? []);
    qc.setQueryData(['business-awards', id], agg.awards ?? []);
    qc.setQueryData(['promotions-active-count', id], agg.active_promotions_count ?? 0);
  }, [query.data, qc, slug]);

  return query;
}