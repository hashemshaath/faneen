/**
 * M6.3 — Staff-vs-owner capability gates for sensitive provider surfaces.
 *
 * `business_staff_permissions` is currently empty (0 rows) — the fine-
 * grained per-module can_view/can_create/... catalog is defined but
 * unused in practice. Until the owner grants explicit permissions, we
 * fall back to sensible defaults driven by `business_staff.role`:
 *
 *   owner  (auth.uid === businesses.user_id)  → everything
 *   staff role='owner'    → membership + contracts + identity fields
 *   staff role='manager'  → contracts (yes), membership (no), identity (no)
 *   staff role='editor'   → read-only for all three
 *   staff role='viewer'   → read-only for all three
 *
 * The three gates cover the highest-privilege surfaces called out in the
 * membership RBAC audit: contract creation/signing, membership
 * purchase/cancel, and business identity fields (legal name, VAT, CR).
 */
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type StaffRole = 'owner' | 'manager' | 'editor' | 'viewer';

export interface BusinessCapabilities {
  isLoading: boolean;
  isOwner: boolean;
  isStaff: boolean;
  staffRole: StaffRole | null;
  canManageContracts: boolean;
  canManageMembership: boolean;
  canEditBusinessIdentity: boolean;
}

const DEFAULT: BusinessCapabilities = {
  isLoading: false,
  isOwner: false,
  isStaff: false,
  staffRole: null,
  canManageContracts: false,
  canManageMembership: false,
  canEditBusinessIdentity: false,
};

export function useBusinessCapabilities(
  businessId: string | null | undefined,
): BusinessCapabilities {
  const { user } = useAuth();
  const uid = user?.id ?? null;

  const query = useQuery({
    queryKey: ['business-capabilities', businessId, uid],
    enabled: !!businessId && !!uid,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const [ownerRes, staffRes] = await Promise.all([
        (supabase as any)
          .from('businesses')
          .select('user_id')
          .eq('id', businessId!)
          .maybeSingle(),
        (supabase as any)
          .from('business_staff')
          .select('role, is_active')
          .eq('business_id', businessId!)
          .eq('user_id', uid!)
          .eq('is_active', true)
          .maybeSingle(),
      ]);
      const ownerUserId: string | null = ownerRes?.data?.user_id ?? null;
      const staffRole: StaffRole | null =
        (staffRes?.data?.role as StaffRole | undefined) ?? null;
      return { ownerUserId, staffRole };
    },
  });

  return useMemo<BusinessCapabilities>(() => {
    if (!businessId || !uid) return DEFAULT;
    if (query.isLoading) return { ...DEFAULT, isLoading: true };
    const ownerUserId = query.data?.ownerUserId ?? null;
    const staffRole = query.data?.staffRole ?? null;
    const isOwner = !!ownerUserId && ownerUserId === uid;
    const isStaff = !isOwner && !!staffRole;

    const isPrivilegedStaff = isStaff && staffRole === 'owner';
    const isManagerOrAbove = isStaff && (staffRole === 'owner' || staffRole === 'manager');

    return {
      isLoading: false,
      isOwner,
      isStaff,
      staffRole,
      canManageContracts: isOwner || isManagerOrAbove,
      canManageMembership: isOwner || isPrivilegedStaff,
      canEditBusinessIdentity: isOwner || isPrivilegedStaff,
    };
  }, [businessId, uid, query.isLoading, query.data]);
}

export type CapabilityKey =
  | 'contracts'
  | 'membership'
  | 'business_identity';

export function capabilityAllowed(
  caps: BusinessCapabilities,
  key: CapabilityKey,
): boolean {
  switch (key) {
    case 'contracts':         return caps.canManageContracts;
    case 'membership':        return caps.canManageMembership;
    case 'business_identity': return caps.canEditBusinessIdentity;
  }
}