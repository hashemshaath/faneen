import { supabase } from '@/integrations/supabase/client';

/**
 * Lightweight counts per status for the admin queue.
 * Uses `head: true` so no rows are transferred — only the count.
 * Falls back to zeros if the row level security blocks the read.
 */
export type AccessRequestStatusCounts = {
  pending: number;
  approved: number;
  rejected: number;
  cancelled: number;
  total: number;
};

async function countOne(status?: string): Promise<number> {
  let q = supabase
    .from('entity_access_requests')
    .select('id', { count: 'exact', head: true });
  if (status) q = q.eq('status', status);
  const { count, error } = await q;
  if (error) return 0;
  return count ?? 0;
}

export async function countEntityAccessRequests(): Promise<AccessRequestStatusCounts> {
  const [pending, approved, rejected, cancelled, total] = await Promise.all([
    countOne('pending'),
    countOne('approved'),
    countOne('rejected'),
    countOne('cancelled'),
    countOne(),
  ]);
  return { pending, approved, rejected, cancelled, total };
}