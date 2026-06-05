import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { countEntityAccessRequests } from '@/modules/entities/services/access';

/**
 * UNIFIED-APPROVALS-CENTER-3 — single source of truth for the three
 * pending-count badges shown in `<UnifiedApprovalsCenterBanner />`.
 *
 * Cached for 60s and refetched on window focus so admins always see a
 * live "what needs attention now" snapshot without each page issuing
 * its own count queries. All reads are read-only and respect RLS.
 */

export interface UnifiedApprovalsCounts {
  approvalsPending: number;   // provider review + username pending
  businessesPending: number;  // businesses awaiting verification
  accessPending: number;      // entity_access_requests.status = 'pending'
}

async function fetchCounts(): Promise<UnifiedApprovalsCounts> {
  const [providerRes, usernameRes, businessRes, accessCounts] = await Promise.all([
    supabase
      .from('businesses')
      .select('id', { count: 'exact', head: true })
      .in('approval_status', ['submitted', 'under_review'] as never[]),
    supabase
      .from('businesses')
      .select('id', { count: 'exact', head: true })
      .eq('username_status', 'pending' as never),
    supabase
      .from('businesses')
      .select('id', { count: 'exact', head: true })
      .eq('is_verified', false as never)
      .neq('approval_status', 'draft' as never),
    countEntityAccessRequests().catch(() => ({ pending: 0 })),
  ]);
  return {
    approvalsPending: (providerRes.count ?? 0) + (usernameRes.count ?? 0),
    businessesPending: businessRes.count ?? 0,
    accessPending: accessCounts.pending ?? 0,
  };
}

export function useUnifiedApprovalsCounts() {
  return useQuery({
    queryKey: ['unified-approvals-counts'],
    queryFn: fetchCounts,
    staleTime: 60_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });
}