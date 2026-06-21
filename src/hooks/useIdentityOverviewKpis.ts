import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { countByRole } from '@/modules/identity';

/**
 * Identity overview KPIs hook.
 *
 * Extracted out of `IdentityOverviewLanding` so the landing tile component
 * stays presentation-only (no direct Supabase imports / queries / rpc /
 * edge calls). Behavior, query keys and fetch shape are unchanged.
 */
export interface IdentityKpis {
  totalUsers: number;
  verifiedUsers: number;
  bannedUsers: number;
  newUsers7d: number;
  pendingAccessRequests: number;
  pendingInvitations: number;
  adminActions24h: number;
  roleCounts: Record<string, number>;
}

async function fetchIdentityKpis(): Promise<IdentityKpis> {
  const since7d = new Date(Date.now() - 7 * 86400_000).toISOString();
  const since24h = new Date(Date.now() - 86400_000).toISOString();

  const [
    totalRes, verifiedRes, bannedRes, new7dRes,
    pendingAccessRes, pendingInvRes, actionsRes, roleCountsRes,
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_verified', true),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_banned', true),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', since7d),
    supabase.from('entity_access_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('business_staff_invitations').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('admin_activity_log').select('*', { count: 'exact', head: true }).gte('created_at', since24h),
    countByRole(),
  ]);

  const roleCounts: Record<string, number> = { ...roleCountsRes };

  return {
    totalUsers: totalRes.count ?? 0,
    verifiedUsers: verifiedRes.count ?? 0,
    bannedUsers: bannedRes.count ?? 0,
    newUsers7d: new7dRes.count ?? 0,
    pendingAccessRequests: pendingAccessRes.count ?? 0,
    pendingInvitations: pendingInvRes.count ?? 0,
    adminActions24h: actionsRes.count ?? 0,
    roleCounts,
  };
}

export function useIdentityOverviewKpis() {
  return useQuery({
    queryKey: ['identity-overview-kpis'],
    queryFn: fetchIdentityKpis,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}