/**
 * Shared hook + type for the "Featured providers" home block.
 * Lifted out of HomeFeaturedShowcase so the home page can re-use the same
 * React Query cache entry to emit Schema.org JSON-LD (LocalBusiness +
 * aggregateRating) without firing a second network call.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface FeaturedProvider {
  id: string;
  username: string | null;
  name_ar: string | null;
  name_en: string | null;
  logo_url: string | null;
  cover_url: string | null;
  rating_avg: number | null;
  rating_count: number | null;
  is_verified: boolean | null;
  cities: { name_ar: string | null; name_en: string | null } | null;
}

export const FEATURED_PROVIDERS_QUERY_KEY = ['home-featured-showcase'] as const;

export const useFeaturedProviders = () =>
  useQuery({
    queryKey: FEATURED_PROVIDERS_QUERY_KEY,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    queryFn: async (): Promise<FeaturedProvider[]> => {
      const { data, error } = await supabase
        .from('businesses_public')
        .select(
          'id, username, name_ar, name_en, logo_url, cover_url, rating_avg, rating_count, is_verified, cities(name_ar, name_en)',
        )
        .eq('is_active', true)
        .eq('is_verified', true)
        .not('rating_avg', 'is', null)
        .order('rating_avg', { ascending: false })
        .order('rating_count', { ascending: false })
        .limit(8);
      if (error) return [];
      return (data ?? []) as unknown as FeaturedProvider[];
    },
  });