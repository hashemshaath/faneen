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

export interface BusinessVisibilityAuditRow {
  id: string;
  ref_id: string | null;
  name_ar: string | null;
  name_en: string | null;
  username: string | null;
  approval_status: string | null;
  username_status: string | null;
  is_active: boolean | null;
  is_demo: boolean | null;
  created_at: string | null;
}

export async function listBusinessVisibilityAudit(
  limit: number,
): Promise<{ data: BusinessVisibilityAuditRow[]; error: unknown }> {
  const { data, error } = await supabase
    .from('businesses')
    .select('id, ref_id, name_ar, name_en, username, approval_status, username_status, is_active, is_demo, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  return { data: (data ?? []) as unknown as BusinessVisibilityAuditRow[], error };
}

export interface AllBusinessesEnrichedRow {
  id: string;
  ref_id: string | null;
  name_ar: string | null;
  name_en: string | null;
  username: string | null;
  approval_status: string | null;
  username_status: string | null;
  is_active: boolean | null;
  is_verified: boolean | null;
  is_demo: boolean | null;
  membership_tier: string | null;
  onboarding_completion: number | null;
  last_active_at: string | null;
  submitted_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

/**
 * Admin-only comprehensive read: every business with the columns the
 * unified Accounts Center needs to render status, tier, completion,
 * username state, verification, demo flag and last activity timestamps.
 * Kept inside this service module to satisfy the businesses-reads
 * isolation audit.
 */
export async function listAllBusinessesEnriched(
  limit = 500,
): Promise<{ data: AllBusinessesEnrichedRow[]; error: unknown }> {
  const { data, error } = await supabase
    .from('businesses')
    .select(
      'id, ref_id, name_ar, name_en, username, approval_status, username_status, ' +
        'is_active, is_verified, is_demo, membership_tier, onboarding_completion, ' +
        'last_active_at, submitted_at, created_at, updated_at',
    )
    .order('created_at', { ascending: false })
    .limit(limit);
  return { data: (data ?? []) as unknown as AllBusinessesEnrichedRow[], error };
}