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
import { getCurrentUser } from '@/modules/identity/services/session';
import type { Database } from '@/integrations/supabase/types';
import type { AdminActivationStatus } from '../resolveServiceEntitlement';
import { normalizeTier } from '../resolveServiceEntitlement';
import type { TierKey } from '@/lib/membership-tiers';
import {
  notifyServiceActivationEvent,
  type ServiceActivationEvent,
} from './notifications';

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
  /** Joined business owner id, used for tier preview / notifications. */
  owner_user_id?: string | null;
  /** Joined business membership tier (denormalised for admin display). */
  current_tier?: TierKey | null;
}

export interface AdminListFilters {
  businessId?: string;
  search?: string;
  providerStatus?: 'active' | 'paused';
  adminStatus?: AdminActivationStatus;
  requiredPlanTier?: Tier | null;
  /** When true, only rows whose `required_plan_tier` is non-null are returned. */
  requiredPlanTierAny?: boolean;
  requiresAdminReview?: boolean;
  premiumOnly?: boolean;
  featuredOnly?: boolean;
  limit?: number;
}

const COLS =
  'id,business_id,category_id,name_ar,name_en,provider_status,admin_status,required_plan_tier,requires_admin_review,is_premium_service,is_featured,is_active,admin_note,provider_note,rejection_reason,reviewed_by,reviewed_at,updated_at,created_at,businesses(user_id,membership_tier)';

/**
 * Lightweight context fetch used by mutation wrappers to address the
 * notification to the provider's owner and include the service name.
 * Never throws; returns null on failure so the mutation still succeeds.
 */
async function loadNotificationContext(serviceId: string): Promise<{
  user_id: string | null;
  business_id: string;
  name_ar: string;
  name_en: string | null;
  required_plan_tier: string | null;
} | null> {
  const { data, error } = await supabase
    .from('business_services')
    .select('business_id,name_ar,name_en,required_plan_tier,businesses(user_id)')
    .eq('id', serviceId)
    .maybeSingle();
  if (error || !data) return null;
  type Joined = {
    business_id: string;
    name_ar: string;
    name_en: string | null;
    required_plan_tier: string | null;
    businesses: { user_id: string | null } | { user_id: string | null }[] | null;
  };
  const row = data as unknown as Joined;
  const biz = Array.isArray(row.businesses) ? row.businesses[0] : row.businesses;
  return {
    user_id: biz?.user_id ?? null,
    business_id: row.business_id,
    name_ar: row.name_ar,
    name_en: row.name_en,
    required_plan_tier: row.required_plan_tier,
  };
}

async function notifyOwner(
  serviceId: string,
  event: ServiceActivationEvent,
  reason?: string | null,
  tierOverride?: string | null,
): Promise<void> {
  const ctx = await loadNotificationContext(serviceId);
  if (!ctx || !ctx.user_id) return;
  notifyServiceActivationEvent({
    user_id: ctx.user_id,
    event,
    business_service_id: serviceId,
    business_id: ctx.business_id,
    service_name_ar: ctx.name_ar,
    service_name_en: ctx.name_en,
    reason: reason ?? null,
    required_plan_tier: tierOverride !== undefined ? tierOverride : ctx.required_plan_tier,
  });
}
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
  if (filters.requiredPlanTierAny) q = q.not('required_plan_tier', 'is', null);
  else if (filters.requiredPlanTier === null) q = q.is('required_plan_tier', null);
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
  type RawRow = Omit<AdminServiceActivationRow, 'owner_user_id'> & {
    businesses:
      | { user_id: string | null; membership_tier: string | null }
      | { user_id: string | null; membership_tier: string | null }[]
      | null;
  };
  const raw = (data ?? []) as unknown as RawRow[];
  return raw.map((r) => {
    const biz = Array.isArray(r.businesses) ? r.businesses[0] : r.businesses;
    return {
      ...r,
      owner_user_id: biz?.user_id ?? null,
      current_tier: normalizeTier(biz?.membership_tier ?? null),
    } as AdminServiceActivationRow;
  });
}

/**
 * SERVICE-ACTIVATION-GOVERNANCE-4 — operations counters for the admin
 * dashboard. Returns lightweight head-count queries (no row payload).
 * Failures fall back to `0` so the dashboard never blocks on this.
 */
export interface ServiceActivationCounters {
  pendingReview: number;
  suspended: number;
  requiresUpgrade: number;
  premium: number;
  featured: number;
}

export async function adminGetServiceActivationCounters(): Promise<ServiceActivationCounters> {
  const base = () => supabase.from('business_services').select('id', { count: 'exact', head: true });
  const [pendingQ, suspendedQ, upgradeQ, premiumQ, featuredQ] = await Promise.all([
    base().eq('requires_admin_review', true),
    base().eq('admin_status', 'suspended'),
    base().not('required_plan_tier', 'is', null),
    base().eq('is_premium_service', true),
    base().eq('is_featured', true),
  ]);
  return {
    pendingReview: pendingQ.count ?? 0,
    suspended: suspendedQ.count ?? 0,
    requiresUpgrade: upgradeQ.count ?? 0,
    premium: premiumQ.count ?? 0,
    featured: featuredQ.count ?? 0,
  };
}

/**
 * SERVICE-ACTIVATION-GOVERNANCE-4 — membership-change notification hook.
 * Sends a SINGLE summary notification to the business owner if any of
 * their services would be gated by the new tier (either because of
 * `required_plan_tier > newTier` or membership-driven quota). Safe to
 * call from any membership update path; never throws.
 */
export async function notifyMembershipChangeForBusiness(
  businessId: string,
  newTier: TierKey | null,
): Promise<void> {
  try {
    const { data: biz } = await supabase
      .from('businesses')
      .select('user_id')
      .eq('id', businessId)
      .maybeSingle();
    const ownerId = (biz as { user_id: string | null } | null)?.user_id ?? null;
    if (!ownerId) return;

    // Count services that REQUIRE a tier strictly higher than the new tier.
    const TIER_RANK: Record<string, number> = { free: 0, basic: 1, premium: 2, enterprise: 3 };
    const curRank = TIER_RANK[newTier ?? 'free'] ?? 0;
    const { data: services } = await supabase
      .from('business_services')
      .select('id,required_plan_tier')
      .eq('business_id', businessId)
      .not('required_plan_tier', 'is', null);
    const affected = (services ?? []).filter((s) => {
      const r = (s as { required_plan_tier: string | null }).required_plan_tier;
      return r && (TIER_RANK[r] ?? 0) > curRank;
    });
    if (affected.length === 0) return;

    notifyServiceActivationEvent({
      user_id: ownerId,
      event: 'membership_change_affected_services',
      business_service_id: affected[0].id,
      business_id: businessId,
      service_name_ar: `${affected.length} خدمة`,
      service_name_en: `${affected.length} service(s)`,
    });
  } catch {
    // never block membership flow
  }
}

async function currentReviewerId(): Promise<string | null> {
  const { data } = await getCurrentUser();
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
  await notifyOwner(id, 'provider_service_activation_approved');
}

export async function adminRejectProviderService(id: string, reason: string): Promise<void> {
  await stampReview(id, {
    admin_status: 'rejected',
    rejection_reason: reason,
    is_active: false,
  });
  await notifyOwner(id, 'provider_service_activation_rejected', reason);
}

export async function adminSuspendProviderService(id: string, reason: string): Promise<void> {
  await stampReview(id, {
    admin_status: 'suspended',
    rejection_reason: reason,
    is_active: false,
  });
  await notifyOwner(id, 'provider_service_suspended_by_admin', reason);
}

export async function adminRestoreProviderService(id: string, note?: string): Promise<void> {
  await stampReview(id, {
    admin_status: 'allowed',
    rejection_reason: null,
    ...(note !== undefined ? { admin_note: note } : {}),
  });
  await notifyOwner(id, 'provider_service_restored_by_admin');
}

export async function adminSetRequiredPlanTier(id: string, tier: Tier): Promise<void> {
  await patchRow(id, { required_plan_tier: tier });
  await notifyOwner(id, 'provider_service_requires_upgrade', null, tier);
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