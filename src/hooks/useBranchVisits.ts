import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const HASH_KEY = 'qitaat_visitor_hash_v1';
const SESSION_PREFIX = 'qitaat_branch_visit_';

function getVisitorHash(): string {
  try {
    let h = localStorage.getItem(HASH_KEY);
    if (!h) {
      h = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
      localStorage.setItem(HASH_KEY, h);
    }
    return h;
  } catch {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  }
}

/**
 * Reads (and records, once per session) the visit count for a branch.
 */
export function useBranchVisits(branchId: string | null | undefined) {
  const qc = useQueryClient();

  const { data: count = 0, isLoading } = useQuery({
    queryKey: ['branch-visit-count', branchId],
    enabled: !!branchId,
    queryFn: async () => {
      const { data } = await supabase.rpc('get_branch_visit_count', { _branch_id: branchId! });
      return Number(data ?? 0);
    },
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!branchId) return;
    const sessionKey = `${SESSION_PREFIX}${branchId}`;
    if (sessionStorage.getItem(sessionKey)) return;
    sessionStorage.setItem(sessionKey, '1');
    void supabase
      .rpc('record_branch_visit', {
        _branch_id: branchId,
        _visitor_hash: getVisitorHash(),
        _event_type: 'view',
      })
      .then(({ data }) => {
        if (typeof data === 'number') {
          qc.setQueryData(['branch-visit-count', branchId], data);
        } else {
          qc.invalidateQueries({ queryKey: ['branch-visit-count', branchId] });
        }
      });
  }, [branchId, qc]);

  return { count, isLoading };
}

/** Fire-and-forget event recorder for phone reveals, shares, etc. */
export function recordBranchEvent(
  branchId: string,
  eventType: 'phone_reveal' | 'whatsapp_click' | 'share' | 'favorite',
) {
  void supabase.rpc('record_branch_visit', {
    _branch_id: branchId,
    _visitor_hash: getVisitorHash(),
    _event_type: eventType,
  });
}