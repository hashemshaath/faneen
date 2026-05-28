/**
 * Admin-only company / entity access diagnostic.
 *
 * Returns a structured snapshot of who has access to a given business
 * and how (owner / staff / delegated). Read-only — no mutations.
 *
 * RLS protection: callers must already be admin; the underlying reads
 * rely on existing admin SELECT policies on businesses / business_staff.
 * No bypass.
 */
import { supabase } from '@/integrations/supabase/client';
import { getAdminBusinessById } from '@/modules/businesses/services/getAdminBusinessById';

export interface CompanyAccessOwner {
  user_id: string;
  is_primary_manager: boolean | null;
}

export interface CompanyAccessStaffEntry {
  staff_id: string;
  user_id: string | null;
  role: string | null;
  is_active: boolean;
  is_primary_manager: boolean | null;
}

export interface CompanyAccessDiagnostic {
  business_id: string;
  ref_id: string | null;
  name_en: string | null;
  name_ar: string | null;
  owner: CompanyAccessOwner | null;
  staff: CompanyAccessStaffEntry[];
  warnings: string[];
}

export async function getAdminCompanyAccessDiagnostic(
  businessId: string,
): Promise<{ data: CompanyAccessDiagnostic | null; error: unknown }> {
  const { data: biz, error: bizErr } = await getAdminBusinessById<{
    id: string;
    ref_id: string | null;
    name_ar: string | null;
    name_en: string | null;
    user_id: string | null;
  }>({
    id: businessId,
    select: 'id, ref_id, name_ar, name_en, user_id',
    terminal: 'maybeSingle',
  });
  if (bizErr || !biz) return { data: null, error: bizErr };

  const { data: staff, error: staffErr } = await supabase
    .from('business_staff')
    .select('id, user_id, role, is_active, is_primary_manager')
    .eq('business_id', businessId);
  if (staffErr) return { data: null, error: staffErr };

  const warnings: string[] = [];
  const owner = biz.user_id ? { user_id: biz.user_id, is_primary_manager: null } : null;

  if (!owner) warnings.push('orphan_business_no_owner');

  const activeStaff = (staff ?? []).filter((s) => s.is_active);
  const primary = activeStaff.filter((s) => s.is_primary_manager === true);
  if (primary.length === 0) warnings.push('no_active_primary_manager');
  if (primary.length > 1) warnings.push('multiple_active_primary_managers');

  // Reflect owner's primary-manager flag (post-Phase-2 backfill).
  if (owner) {
    const ownerStaff = activeStaff.find((s) => s.user_id === owner.user_id && s.role === 'owner');
    owner.is_primary_manager = ownerStaff?.is_primary_manager ?? null;
    if (ownerStaff && ownerStaff.is_primary_manager !== true) {
      warnings.push('owner_not_primary_manager');
    }
  }

  return {
    data: {
      business_id: biz.id,
      ref_id: biz.ref_id ?? null,
      name_en: biz.name_en ?? null,
      name_ar: biz.name_ar ?? null,
      owner,
      staff: (staff ?? []).map((s) => ({
        staff_id: s.id,
        user_id: s.user_id ?? null,
        role: s.role ?? null,
        is_active: !!s.is_active,
        is_primary_manager: s.is_primary_manager ?? null,
      })),
      warnings,
    },
    error: null,
  };
}