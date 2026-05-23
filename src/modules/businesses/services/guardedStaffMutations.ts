/**
 * R4E-3 — Guarded business_staff mutation wrappers.
 *
 * Centralizes all sensitive business_staff writes (role change, deactivation,
 * removal) behind explicit named functions. DB sole-owner guard remains
 * authoritative. Enforced by `scripts/business-staff-isolation-audit.mjs`.
 */
import type { StaffRole } from '@/components/dashboard/business-edit/types';
import { updateBusinessStaffById } from './updateBusinessStaffById';
import { deleteBusinessStaffById } from './deleteBusinessStaffById';

function unwrap(result: { error: unknown }): void {
  if (result.error) {
    const e = result.error as { message?: string };
    throw e instanceof Error ? e : new Error(e?.message ?? 'Update failed');
  }
}

export async function updateBusinessStaffRole(
  staffId: string,
  role: StaffRole,
): Promise<void> {
  const res = await updateBusinessStaffById({ id: staffId, values: { role } });
  unwrap(res);
}

export async function setBusinessStaffActive(
  staffId: string,
  isActive: boolean,
): Promise<void> {
  const res = await updateBusinessStaffById({ id: staffId, values: { is_active: isActive } });
  unwrap(res);
}

export async function removeBusinessStaff(staffId: string): Promise<void> {
  const res = await deleteBusinessStaffById({ id: staffId });
  unwrap(res);
}