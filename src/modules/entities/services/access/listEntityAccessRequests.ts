import { supabase } from '@/integrations/supabase/client';

/**
 * REGISTRATION-UX-FULL-COMPLETE-1 Part 2
 * Admin-side listing of access requests. Returns safe fields only — no
 * requester email/phone, no tokens. Joins the target business for the
 * human-readable reference + name when available.
 */
export interface ListEntityAccessRequestsOptions {
  status?: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'all';
  limit?: number;
  offset?: number;
  /** When true, returns a `count` of matching rows (exact). */
  withCount?: boolean;
}

export interface EntityAccessRequestListRow {
  id: string;
  ref_id: string;
  requester_user_id: string;
  target_business_id: string | null;
  target_ref: string | null;
  message: string | null;
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  target_business: {
    id: string;
    ref_id: string | null;
    legacy_ref_id: string | null;
    name_ar: string | null;
    name_en: string | null;
  } | null;
}

const SAFE_SELECT =
  'id, ref_id, requester_user_id, target_business_id, target_ref, message, status, ' +
  'reviewed_by, reviewed_at, created_at, ' +
  'target_business:target_business_id(id, ref_id, legacy_ref_id, name_ar, name_en)';

export async function listEntityAccessRequests(
  options: ListEntityAccessRequestsOptions = {},
): Promise<{ data: EntityAccessRequestListRow[]; count: number | null; error: unknown }> {
  const { status = 'pending', limit = 100, offset = 0, withCount = false } = options;
  let q = supabase
    .from('entity_access_requests')
    .select(SAFE_SELECT, withCount ? { count: 'exact' } : undefined)
    .order('created_at', { ascending: false })
    .range(offset, offset + Math.max(0, limit - 1));
  if (status !== 'all') q = q.eq('status', status);
  const { data, error, count } = await q;
  return {
    data: (data as unknown as EntityAccessRequestListRow[]) ?? [],
    count: count ?? null,
    error,
  };
}