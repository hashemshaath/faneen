/**
 * R4E-3 — Guarded business mutation wrappers.
 *
 * Replaces the previous generic `{ values: { [field]: value } }` pattern for
 * sensitive fields with explicit per-field wrappers. This:
 *   - removes the ability to silently bag-write sensitive columns from the UI,
 *   - keeps DB-level RLS / triggers as the authoritative guard,
 *   - is enforced by `scripts/businesses-sensitive-fields-isolation-audit.mjs`.
 *
 * NOTE: `membership_tier` is intentionally NOT exposed here — it is owned by
 * `setBusinessMembershipTier` (RPC) and audited separately.
 */
import { updateBusinessById } from './updateBusinessById';
import { updateBusinessesByIds } from './updateBusinessesByIds';

function unwrap(result: { error: unknown }): void {
  if (result.error) {
    const e = result.error as { message?: string };
    throw e instanceof Error ? e : new Error(e?.message ?? 'Update failed');
  }
}

export async function setBusinessActive(
  businessId: string,
  isActive: boolean,
): Promise<void> {
  const res = await updateBusinessById({ id: businessId, values: { is_active: isActive } });
  unwrap(res);
}

export async function setBusinessVerified(
  businessId: string,
  isVerified: boolean,
): Promise<void> {
  const res = await updateBusinessById({ id: businessId, values: { is_verified: isVerified } });
  unwrap(res);
}

export async function bulkSetBusinessesActive(
  ids: string[],
  isActive: boolean,
): Promise<void> {
  const res = await updateBusinessesByIds({ ids, values: { is_active: isActive } });
  unwrap(res);
}

export async function bulkSetBusinessesVerified(
  ids: string[],
  isVerified: boolean,
): Promise<void> {
  const res = await updateBusinessesByIds({ ids, values: { is_verified: isVerified } });
  unwrap(res);
}