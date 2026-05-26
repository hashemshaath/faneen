/**
 * Admin-only composition: list entity links for a single user.
 *
 * Combines:
 *   - businesses owned by the user (via `listAdminBusinesses` with user_id filter)
 *   - business_staff rows for the user (via `listAllBusinessStaffForAdmin`)
 *
 * Returns a safe projection only — no documents, no commercial registration,
 * no contact phones, no synthetic identifiers. Designed to power the
 * `/admin/users` and `/admin/users/:id` "Linked entities" sections without
 * direct supabase.from() access in the UI.
 */
import { listAdminBusinesses } from '@/modules/businesses/services/listAdminBusinesses';
import { listAllBusinessStaffForAdmin } from '@/modules/businesses/services/listAllBusinessStaffForAdmin';

export type UserEntityRole = 'owner' | 'manager' | 'editor' | 'viewer';

export interface UserEntityLink {
  business_id: string;
  business_ref_id: string | null;
  business_legacy_ref_id: string | null;
  business_name_ar: string | null;
  business_name_en: string | null;
  business_username: string | null;
  is_verified: boolean;
  is_active: boolean;
  membership_tier: string | null;
  approval_status: string | null;
  /** business_staff.id (null when relationship is pure ownership). */
  staff_id: string | null;
  /** business_staff.ref_id (STF-...). */
  staff_ref_id: string | null;
  role: UserEntityRole;
  /** True when user owns the entity record itself (businesses.user_id = user). */
  is_owner_by_entity: boolean;
  is_primary_manager: boolean;
  joined_at: string | null;
}

interface BizRow {
  id: string;
  user_id: string;
  ref_id: string | null;
  legacy_ref_id: string | null;
  name_ar: string | null;
  name_en: string | null;
  username: string | null;
  is_active: boolean | null;
  is_verified: boolean | null;
  membership_tier: string | null;
  approval_status: string | null;
}

interface StaffRow {
  id: string;
  ref_id: string | null;
  business_id: string;
  user_id: string;
  role: UserEntityRole;
  is_active: boolean;
  is_primary_manager: boolean;
  created_at: string;
}

export async function listUserEntityLinks(
  userId: string,
): Promise<{ data: UserEntityLink[]; error: unknown }> {
  if (!userId) return { data: [], error: null };

  // 1) Owned entities.
  const ownedRes = await listAdminBusinesses<BizRow>({
    select:
      'id, user_id, ref_id, legacy_ref_id, name_ar, name_en, username, is_active, is_verified, membership_tier, approval_status',
    filters: [{ column: 'user_id', op: 'eq', value: userId }],
  });
  if (ownedRes.error) return { data: [], error: ownedRes.error };

  // 2) Staff rows for this user (filter client-side; wrapper has no per-user filter).
  const staffRes = await listAllBusinessStaffForAdmin<StaffRow>({
    select: 'id, ref_id, business_id, user_id, role, is_active, is_primary_manager, created_at',
  });
  if (staffRes.error) return { data: [], error: staffRes.error };

  const owned = (ownedRes.data ?? []) as BizRow[];
  const staff = (staffRes.data ?? []).filter((s) => s.user_id === userId);

  // 3) Resolve businesses referenced by staff rows that the user does not own.
  const missingBizIds = staff
    .map((s) => s.business_id)
    .filter((id) => !owned.some((b) => b.id === id));
  let extraBizMap = new Map<string, BizRow>();
  if (missingBizIds.length > 0) {
    const extraRes = await listAdminBusinesses<BizRow>({
      select:
        'id, user_id, ref_id, legacy_ref_id, name_ar, name_en, username, is_active, is_verified, membership_tier, approval_status',
      filters: [{ column: 'id', op: 'in', value: missingBizIds }],
    });
    if (extraRes.error) return { data: [], error: extraRes.error };
    extraBizMap = new Map((extraRes.data ?? []).map((b) => [b.id, b]));
  }

  const links = new Map<string, UserEntityLink>();

  const toLink = (biz: BizRow, staffRow: StaffRow | null): UserEntityLink => {
    const isOwnerByEntity = biz.user_id === userId;
    const role: UserEntityRole = isOwnerByEntity ? 'owner' : (staffRow?.role ?? 'viewer');
    return {
      business_id: biz.id,
      business_ref_id: biz.ref_id,
      business_legacy_ref_id: biz.legacy_ref_id,
      business_name_ar: biz.name_ar,
      business_name_en: biz.name_en,
      business_username: biz.username,
      is_verified: !!biz.is_verified,
      is_active: (biz.is_active ?? true) && (staffRow ? staffRow.is_active : true),
      membership_tier: biz.membership_tier,
      approval_status: biz.approval_status,
      staff_id: staffRow?.id ?? null,
      staff_ref_id: staffRow?.ref_id ?? null,
      role,
      is_owner_by_entity: isOwnerByEntity,
      is_primary_manager: !!staffRow?.is_primary_manager,
      joined_at: staffRow?.created_at ?? null,
    };
  };

  for (const biz of owned) {
    links.set(biz.id, toLink(biz, null));
  }
  for (const s of staff) {
    const biz = owned.find((b) => b.id === s.business_id) ?? extraBizMap.get(s.business_id);
    if (!biz) continue;
    const existing = links.get(biz.id);
    if (existing) {
      // Keep ownership but record the staff ref so admin actions can target the row.
      existing.staff_id = s.id;
      existing.staff_ref_id = s.ref_id;
      existing.is_primary_manager = existing.is_primary_manager || s.is_primary_manager;
      existing.is_active = existing.is_active && s.is_active;
      existing.joined_at = existing.joined_at ?? s.created_at;
      continue;
    }
    links.set(biz.id, toLink(biz, s));
  }

  return { data: Array.from(links.values()), error: null };
}