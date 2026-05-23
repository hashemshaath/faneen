import { useQuery } from '@tanstack/react-query';
import { hasMembershipFeature } from '@/modules/memberships';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Frontend feature gate backed by `has_membership_feature()` RPC.
 * Returns { allowed, isLoading } for the given feature key.
 * - boolean limit fields → enabled flag
 * - numeric limit fields → enabled when value > 0
 * Falls back to `false` when unauthenticated or while loading.
 */
export function useFeatureGate(featureKey: string | null | undefined, businessId?: string | null) {
  const { user } = useAuth();
  const enabled = Boolean(user?.id && featureKey);

  const { data, isLoading } = useQuery({
    queryKey: ['feature-gate', user?.id, featureKey, businessId ?? null],
    enabled,
    staleTime: 60_000,
    queryFn: async (): Promise<boolean> => {
      if (!user?.id || !featureKey) return false;
      const { data, error } = await hasMembershipFeature({
        _user_id: user.id,
        _feature_key: featureKey,
        _business_id: businessId ?? undefined,
      });
      if (error) return false;
      return Boolean(data);
    },
  });

  return { allowed: Boolean(data), isLoading: enabled && isLoading };
}