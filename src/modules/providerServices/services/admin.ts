/**
 * SERVICE-ACTIVATION-GOVERNANCE-2 — Phase D
 *
 * Admin-only mutations for the `business_services` governance fields.
 * All writes go through here so the dashboard/service-activations page
 * (and any future admin surface) never touches Supabase directly.
 *
 * RLS allows these updates only for users with the `admin` role
 * (see migration 20260601072159). The wrapper also stamps
 * `reviewed_by` / `reviewed_at` for state-changing actions.
 */
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import type { AdminActivationStatus } from '../resolveServiceEntitlement';

type Tier = Database['public']['Enums']['membership_tier'];

export interface AdminServiceActivationRow {
  id: string;
  business_id: string;
  category_id: string | null;
  name_ar: string;
  name_en: string | null;
  provider_status: string;
  admin_status: string;
  required_plan_tier: Tier | null;
  requires_admin_review: boolean;
  is_premium_service: boolean;
  is_featured: boolean;
  is_active: boolean;
  admin_note: string | null;
  provider_note: string | null;
  rejection_reason: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  updated_at: string;
  created_at: string;
}

export interface AdminListFilters {
  businessId?: string;
  search?: string;
  providerStatus?: 'active' | 'paused';
  adminStatus?: AdminActivationStatus;
  requiredPlanTier?: Tier | null;
  requiresAdminReview?: boolean;
  premiumOnly?: boolean;
  featuredOnly?: boolean;
  limit?: number;
}

const COLS =
  'id,business_id,category_id,name_ar,name_en,provider_status,admin_status,required_plan_tier,requires_admin_review,is_premium_service,is_featured,is_active,admin_note,provider_note,rejection_reason,reviewed_by,reviewed_at,updated_at,created_at';

export async function adminListServiceActivations(
  filters: AdminListFilters = {},
): Promise<AdminServiceActivationRow[]> {
  let q = supabase
    .from('business_services')
    .select(COLS)
    .order('updated_at', { ascending: false })
    .limit(filters.limit ?? 500);

  if (filters.businessId) q = q.eq('business_id', filters.businessId);
  if (filters.providerStatus) q = q.eq('provider_status', filters.providerStatus);
  if (filters.adminStatus) q = q.eq('admin_status', filters.adminStatus);
  if (filters.requiredPlanTier === null) q = q.is('required_plan_tier', null);
  else if (filters.requiredPlanTier) q = q.eq('required_plan_tier', filters.requiredPlanTier);
  if (filters.requiresAdminReview !== undefined)
    q = q.eq('requires_admin_review', filters.requiresAdminReview);
  if (filters.premiumOnly) q = q.eq('is_premium_service', true);
  if (filters.featuredOnly) q = q.eq('is_featured', true);
  if (filters.search && filters.search.trim()) {
    const term = `%${filters.search.trim()}%`;
    q = q.or(`name_ar.ilike.${term},name_en.ilike.${term}`);
  }

  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as AdminServiceActivationRow[];
}

async function currentReviewerId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

async function patchRow(
  id: string,
  patch: Partial<Database['public']['Tables']['business_services']['Update']>,
): Promise<void> {
  const { error } = await supabase.from('business_services').update(patch).eq('id', id);
  if (error) throw error;
}

async function stampReview(
  id: string,
  patch: Partial<Database['public']['Tables']['business_services']['Update']>,
): Promise<void> {
  const reviewer = await currentReviewerId();
  await patchRow(id, {
    ...patch,
    reviewed_by: reviewer,
    reviewed_at: new Date().toISOString(),
  });
}

export async function adminApproveProviderService(id: string, note?: string): Promise<void> {
  await stampReview(id, {
    admin_status: 'allowed',
    rejection_reason: null,
    requires_admin_review: false,
    ...(note !== undefined ? { admin_note: note } : {}),
  });
}

export async function adminRejectProviderService(id: string, reason: string): Promise<void> {
  await stampReview(id, {
    admin_status: 'rejected',
    rejection_reason: reason,
    is_active: false,
  });
}

export async function adminSuspendProviderService(id: string, reason: string): Promise<void> {
  await stampReview(id, {
    admin_status: 'suspended',
    rejection_reason: reason,
    is_active: false,
  });
}

export async function adminRestoreProviderService(id: string, note?: string): Promise<void> {
  await stampReview(id, {
    admin_status: 'allowed',
    rejection_reason: null,
    ...(note !== undefined ? { admin_note: note } : {}),
  });
}

export async function adminSetRequiredPlanTier(id: string, tier: Tier): Promise<void> {
  await patchRow(id, { required_plan_tier: tier });
}

export async function adminClearRequiredPlanTier(id: string): Promise<void> {
  await patchRow(id, { required_plan_tier: null });
}

export async function adminSetRequiresReview(id: string, value: boolean): Promise<void> {
  await patchRow(id, {
    requires_admin_review: value,
    ...(value ? { admin_status: 'pending_review' as const } : {}),
  });
}

export async function adminSetPremiumService(id: string, value: boolean): Promise<void> {
  await patchRow(id, { is_premium_service: value });
}

export async function adminSetFeaturedService(id: string, value: boolean): Promise<void> {
  await patchRow(id, { is_featured: value });
}

export async function adminUpdateServiceActivationNote(id: string, note: string): Promise<void> {
  await patchRow(id, { admin_note: note });
}