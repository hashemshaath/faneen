import { supabase } from '@/integrations/supabase/client';

/**
 * Approvals Center wrappers — keep direct `businesses` table access
 * inside the businesses service module to satisfy the isolation audit.
 */

export interface PendingProviderReviewRow {
  id: string;
  ref_id: string | null;
  name_ar: string | null;
  name_en: string | null;
  username: string | null;
  submitted_at: string | null;
  approval_status: string | null;
}

export async function listPendingProviderReviewBusinesses(
  limit: number,
): Promise<{ data: PendingProviderReviewRow[]; count: number; error: unknown }> {
  const { data, count, error } = await supabase
    .from('businesses')
    .select(
      'id, ref_id, name_ar, name_en, username, submitted_at, approval_status',
      { count: 'exact' },
    )
    .in('approval_status', ['submitted', 'under_review'] as never[])
    .order('submitted_at', { ascending: false, nullsFirst: false })
    .limit(limit);
  return {
    data: (data ?? []) as unknown as PendingProviderReviewRow[],
    count: count ?? 0,
    error,
  };
}

export interface PendingUsernameRow {
  id: string;
  ref_id: string | null;
  name_ar: string | null;
  name_en: string | null;
  username: string | null;
  created_at: string | null;
  username_status: string | null;
}

export async function listPendingUsernameBusinesses(
  limit: number,
): Promise<{ data: PendingUsernameRow[]; count: number; error: unknown }> {
  const { data, count, error } = await supabase
    .from('businesses')
    .select(
      'id, ref_id, name_ar, name_en, username, created_at, username_status',
      { count: 'exact' },
    )
    .eq('username_status', 'pending' as never)
    .order('created_at', { ascending: false })
    .limit(limit);
  return {
    data: (data ?? []) as unknown as PendingUsernameRow[],
    count: count ?? 0,
    error,
  };
}