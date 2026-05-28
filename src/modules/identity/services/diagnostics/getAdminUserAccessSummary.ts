/**
 * Admin-only per-user access summary. Read-only.
 *
 * Aggregates owned entities, active staff memberships, and a stale-state
 * indicator (e.g. owner exists but no active business_staff owner row),
 * to support triage without exposing raw PII.
 */
import { supabase } from '@/integrations/supabase/client';
import { listOwnerBusinesses } from '@/modules/businesses/services/listOwnerBusinesses';

export interface UserAccessSummary {
  user_id: string;
  owned_business_ids: string[];
  staff_business_ids: string[];
  effective_business_ids: string[];
  workspace_accessible: boolean;
  warnings: string[];
}

export async function getAdminUserAccessSummary(
  userId: string,
): Promise<{ data: UserAccessSummary | null; error: unknown }> {
  const { data: owned, error: ownedErr } = await listOwnerBusinesses<{ id: string }>({
    userId,
    select: 'id',
  });
  if (ownedErr) return { data: null, error: ownedErr };

  const { data: staff, error: staffErr } = await supabase
    .from('business_staff')
    .select('business_id, role, is_active, is_primary_manager')
    .eq('user_id', userId)
    .eq('is_active', true);
  if (staffErr) return { data: null, error: staffErr };

  const owned_business_ids = (owned ?? []).map((r) => r.id);
  const staff_business_ids = (staff ?? [])
    .map((s) => s.business_id)
    .filter((id): id is string => !!id);
  const effective = Array.from(new Set([...owned_business_ids, ...staff_business_ids]));

  const warnings: string[] = [];
  // Owner with no matching active owner staff row (broken Phase-2 invariant).
  for (const bid of owned_business_ids) {
    const row = (staff ?? []).find((s) => s.business_id === bid && s.role === 'owner');
    if (!row) warnings.push(`owner_missing_staff_row:${bid}`);
    else if (row.is_primary_manager !== true) warnings.push(`owner_not_primary_manager:${bid}`);
  }
  if (effective.length === 0) warnings.push('no_accessible_entities');

  return {
    data: {
      user_id: userId,
      owned_business_ids,
      staff_business_ids,
      effective_business_ids: effective,
      workspace_accessible: effective.length > 0,
      warnings,
    },
    error: null,
  };
}