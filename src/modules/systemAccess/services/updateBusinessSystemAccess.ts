/**
 * SYSTEM-ACCESS-MEMBERSHIP-SYNC-1 — Single admin write wrapper.
 *
 * All `/admin/system-access` writes flow through this function. It:
 *   1. Validates admin permission (caller must pass `isAdmin: true`).
 *   2. Optionally pre-checks membership entitlement before enabling.
 *   3. Calls the existing security-definer RPC, which writes the
 *      `system_module_audit_log` row server-side.
 *   4. Records an observability event for the access change.
 *   5. Returns enough metadata for the caller to invalidate caches.
 *
 * Never throws on observability failure — audit comes from the RPC.
 */
import {
  setModuleOverride,
  clearModuleOverride,
  type ScopeType,
} from '@/modules/systemAccess';
import { hasMembershipFeature } from '@/modules/memberships';

export interface UpdateBusinessSystemAccessArgs {
  moduleKey: string;
  scopeType: ScopeType;
  scopeValue: string | null;
  enabled: boolean;
  /** When true, do not call the RPC — just clear the override. */
  reset?: boolean;
  reason?: string | null;
  /** Optional membership context for entitlement pre-check. */
  actingUserId?: string | null;
  businessId?: string | null;
  /** Caller must assert admin. */
  isAdmin: boolean;
  /** When true, ignore membership block (admin force). Default false. */
  bypassMembership?: boolean;
}

export interface UpdateBusinessSystemAccessResult {
  ok: boolean;
  blocked_by_membership: boolean;
  reason_ar?: string;
  reason_en?: string;
  changed: boolean;
  audit_recorded: boolean;
  observability_recorded: boolean;
  version: number;
}

const MEMBERSHIP_BLOCK_AR = 'لا يمكن تفعيل هذا النظام لأن الباقة الحالية لا تدعمه.';
const MEMBERSHIP_BLOCK_EN = 'This system cannot be enabled because the current plan does not include it.';
const NOT_ADMIN_AR = 'يتطلب صلاحية مسؤول.';
const NOT_ADMIN_EN = 'Admin permission required.';

/**
 * The canonical audit + observability sink for system-access changes is
 * `system_module_audit_log`, which the security-definer RPC writes for us
 * (action, scope, previous/new state, actor). We log a structured browser
 * console event so DevTools / Sentry-style listeners can attach without a
 * second table write.
 */
function recordObservability(payload: Record<string, unknown>): boolean {
  try {
    // eslint-disable-next-line no-console
    console.info('[observability] system_access.updated', payload);
    return true;
  } catch {
    return false;
  }
}

export async function updateBusinessSystemAccess(
  args: UpdateBusinessSystemAccessArgs,
): Promise<UpdateBusinessSystemAccessResult> {
  const base: UpdateBusinessSystemAccessResult = {
    ok: false, blocked_by_membership: false, changed: false,
    audit_recorded: false, observability_recorded: false, version: Date.now(),
  };

  if (!args.isAdmin) {
    return { ...base, reason_ar: NOT_ADMIN_AR, reason_en: NOT_ADMIN_EN };
  }

  // Membership pre-check (only when enabling a non-reset write).
  if (args.enabled && !args.reset && !args.bypassMembership && args.actingUserId) {
    try {
      const { data } = await hasMembershipFeature({
        _user_id: args.actingUserId,
        _feature_key: args.moduleKey,
        _business_id: args.businessId ?? undefined,
      });
      // Only block on an explicit `false` answer. `null` (unknown) is allowed.
      if (data === false) {
        return {
          ...base,
          blocked_by_membership: true,
          reason_ar: MEMBERSHIP_BLOCK_AR,
          reason_en: MEMBERSHIP_BLOCK_EN,
        };
      }
    } catch {
      // Fail open on lookup failure — RLS remains authoritative.
    }
  }

  try {
    if (args.reset) {
      await clearModuleOverride({
        moduleKey: args.moduleKey,
        scopeType: args.scopeType,
        scopeValue: args.scopeValue,
      });
    } else {
      await setModuleOverride({
        moduleKey: args.moduleKey,
        scopeType: args.scopeType,
        scopeValue: args.scopeValue,
        enabled: args.enabled,
        reason: args.reason ?? null,
      });
    }
  } catch (e) {
    return { ...base, reason_en: e instanceof Error ? e.message : 'Update failed' };
  }

  // Audit is written server-side by the SECURITY DEFINER RPC.
  const audit_recorded = true;

  const observability_recorded = recordObservability({
    business_ref: args.scopeType === 'entity' ? args.scopeValue : null,
    scope_type: args.scopeType,
    module_key: args.moduleKey,
    enabled: args.reset ? null : args.enabled,
    reset: !!args.reset,
    source: 'admin_system_access_console',
    ts: new Date().toISOString(),
  });

  return {
    ok: true,
    blocked_by_membership: false,
    changed: true,
    audit_recorded,
    observability_recorded,
    version: Date.now(),
  };
}