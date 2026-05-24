import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { getOwnerBusiness } from '@/modules/businesses/services/getOwnerBusiness';

/**
 * Returns the canonical "ID to show in the UI" for the current user.
 *
 * - Provider/business accounts: the linked business `ref_id` (BIZ-NNNNNNN).
 * - Everyone else: the profile `ref_id` (USR-NNNNNNN).
 *
 * Falls back to the profile ref_id while the business lookup is loading
 * or if no business is linked yet.
 */
export function useDisplayRefId(): string | null {
  const { user, profile, isProvider } = useAuth();
  const userId = user?.id;

  const { data } = useQuery({
    queryKey: ['display-ref-id-business', userId],
    enabled: !!userId && isProvider,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await getOwnerBusiness<{ ref_id: string | null }>({
        userId: userId!,
        select: 'ref_id',
        activeOnly: true,
      });
      return data?.ref_id ?? null;
    },
  });

  if (isProvider && data) return data;
  return profile?.ref_id ?? null;
}