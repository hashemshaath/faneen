/**
 * Helpers for auditing blocked membership upgrade attempts.
 * Centralizes the reason classifier + the `log_upgrade_rejection` RPC call so
 * the logic can be unit/integration-tested independently of the Membership page.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

export type RejectionReason =
  | 'ref_id_mismatch'
  | 'business_user_mismatch'
  | 'business_not_found'
  | 'missing_ref_id';

/**
 * Bilingual labels for each rejection reason — surfaced directly to the
 * end user in the failure toast and in the admin audit table.
 */
export const REJECTION_REASON_LABELS: Record<RejectionReason, { ar: string; en: string }> = {
  ref_id_mismatch:        { ar: 'عدم تطابق المعرّف المرجعي للمنشأة', en: 'Business reference (ref_id) mismatch' },
  business_user_mismatch: { ar: 'المنشأة غير مرتبطة بحسابك',         en: 'Business does not belong to your account' },
  business_not_found:     { ar: 'تعذّر العثور على المنشأة',            en: 'Business not found' },
  missing_ref_id:         { ar: 'المعرّف المرجعي للمنشأة مفقود',      en: 'Missing business ref_id' },
};

export function rejectionReasonLabel(reason: RejectionReason, isRTL: boolean): string {
  const l = REJECTION_REASON_LABELS[reason];
  return isRTL ? l.ar : l.en;
}

/**
 * Classify a Postgres/RLS error message coming back from the
 * `membership_upgrade_requests` insert into a stable reason code.
 * Returns `null` when the message is not a known rejection (caller skips logging).
 */
export function classifyRejectionReason(message: string | null | undefined): RejectionReason | null {
  const msg = (message ?? '').toString();
  if (!msg) return null;
  if (/business_ref_id .* does not match/i.test(msg)) return 'ref_id_mismatch';
  if (/does not belong/i.test(msg)) return 'business_user_mismatch';
  if (/Business not found/i.test(msg)) return 'business_not_found';
  if (/business_ref_id is required/i.test(msg)) return 'missing_ref_id';
  return null;
}

export interface LogUpgradeRejectionInput {
  errorMessage: string;
  attemptedBusinessId: string | null;
  attemptedBusinessRefId: string | null;
  requestedTier: string | null;
  billingCycle: string | null;
  userAgent?: string | null;
}

export interface LogUpgradeRejectionResult {
  reason: RejectionReason | null;
  logged: boolean;
  /** UUID of the inserted `membership_upgrade_rejections` row, when logged. */
  auditId?: string | null;
  error?: unknown;
}

/**
 * Best-effort logger: classify the message, and when it maps to a known
 * rejection code, call `log_upgrade_rejection`. Never throws.
 */
export async function logUpgradeRejection(
  client: Pick<SupabaseClient, 'rpc'>,
  input: LogUpgradeRejectionInput,
): Promise<LogUpgradeRejectionResult> {
  const reason = classifyRejectionReason(input.errorMessage);
  if (!reason) return { reason: null, logged: false };

  const ua =
    input.userAgent !== undefined
      ? input.userAgent
      : typeof navigator !== 'undefined'
        ? navigator.userAgent.slice(0, 300)
        : null;

  try {
     
    const { data, error } = await (client.rpc as any)('log_upgrade_rejection', {
      _attempted_business_id: input.attemptedBusinessId,
      _attempted_business_ref_id: input.attemptedBusinessRefId,
      _requested_tier: input.requestedTier,
      _billing_cycle: input.billingCycle,
      _reason_code: reason,
      _error_message: (input.errorMessage ?? '').slice(0, 500),
      _user_agent: ua,
    });
    if (error) return { reason, logged: false, error };
    return { reason, logged: true, auditId: (data as string | null) ?? null };
  } catch (error) {
    return { reason, logged: false, error };
  }
}