/**
 * SYSTEM-ACCESS-MEMBERSHIP-SYNC-1 — Canonical effective-access resolver.
 *
 * Single source of truth for "what systems can this business actually use
 * right now?". Merges, in order:
 *
 *   1. Business status (active vs suspended)         → source: 'business_status'
 *   2. Membership plan / feature entitlement         → source: 'membership'
 *   3. Admin overrides (entity scope)                → source: 'admin_override'
 *
 * Pure, side-effect-free, NEVER throws. Not an authorization boundary —
 * RLS + `has_membership_feature` + `get_user_visible_modules` remain
 * authoritative on the server.
 */
import type { EffectiveVisibility, SystemModule } from './index';

export type AccessSource =
  | 'business_status'
  | 'membership'
  | 'admin_override'
  | 'role'
  | 'default';

export interface EffectiveAccessEntry {
  module_key: string;
  enabled: boolean;
  source: AccessSource;
  reason_ar: string | null;
  reason_en: string | null;
}

export interface EffectiveBusinessAccess {
  allowed: string[];
  disabled: string[];
  entries: EffectiveAccessEntry[];
  /** Monotonic version used by realtime invalidation consumers. */
  version: number;
  updated_at: string;
  /** Per-source breakdown of which keys came from where. */
  sources: Record<AccessSource, string[]>;
}

export interface ResolveEffectiveBusinessAccessInput {
  modules: SystemModule[];
  visibility?: EffectiveVisibility[] | null;
  /** Per feature_key, whether the active plan entitles the business. */
  membershipFeatures?: Record<string, boolean> | null;
  businessStatus?: 'active' | 'suspended' | 'pending' | null;
  isAdmin?: boolean;
  now?: string;
}

const SUSPENDED_REASON_AR = 'الحساب غير مفعّل';
const SUSPENDED_REASON_EN = 'Business is not active';
const MEMBERSHIP_BLOCK_AR = 'محجوب بسبب الباقة';
const MEMBERSHIP_BLOCK_EN = 'Blocked by current plan';
const ADMIN_DISABLED_AR = 'معطل من الإدارة';
const ADMIN_DISABLED_EN = 'Disabled by admin';
const ACTIVE_AR = 'فعّال';
const ACTIVE_EN = 'Active';

export function resolveEffectiveBusinessAccess(
  input: ResolveEffectiveBusinessAccessInput | null | undefined,
): EffectiveBusinessAccess {
  const empty: EffectiveBusinessAccess = {
    allowed: [],
    disabled: [],
    entries: [],
    version: 0,
    updated_at: new Date(0).toISOString(),
    sources: { business_status: [], membership: [], admin_override: [], role: [], default: [] },
  };
  if (!input || !Array.isArray(input.modules)) return empty;

  try {
    const visibilityByKey = new Map<string, EffectiveVisibility>();
    for (const v of input.visibility ?? []) visibilityByKey.set(v.module_key, v);

    const status = input.businessStatus ?? 'active';
    const features = input.membershipFeatures ?? null;

    const entries: EffectiveAccessEntry[] = [];
    const sources: EffectiveBusinessAccess['sources'] = {
      business_status: [], membership: [], admin_override: [], role: [], default: [],
    };

    for (const m of input.modules) {
      // Core modules are always enabled — never gated by membership or admin.
      if (m.is_core) {
        entries.push({
          module_key: m.key, enabled: true, source: 'default',
          reason_ar: ACTIVE_AR, reason_en: ACTIVE_EN,
        });
        sources.default.push(m.key);
        continue;
      }

      // 1. Business status — suspended blocks everything non-core.
      if (status !== 'active' && !input.isAdmin) {
        entries.push({
          module_key: m.key, enabled: false, source: 'business_status',
          reason_ar: SUSPENDED_REASON_AR, reason_en: SUSPENDED_REASON_EN,
        });
        sources.business_status.push(m.key);
        continue;
      }

      const v = visibilityByKey.get(m.key);
      const adminEnabled = v ? v.enabled : m.default_enabled;
      const adminOverridden = v?.source === 'entity' || v?.source === 'user' || v?.source === 'account_type';

      // 2. Admin disable wins — clear, immediate hide.
      if (!adminEnabled) {
        entries.push({
          module_key: m.key, enabled: false, source: 'admin_override',
          reason_ar: ADMIN_DISABLED_AR, reason_en: ADMIN_DISABLED_EN,
        });
        sources.admin_override.push(m.key);
        continue;
      }

      // 3. Membership entitlement.
      const featureKey = m.key;
      if (features && Object.prototype.hasOwnProperty.call(features, featureKey)) {
        const entitled = Boolean(features[featureKey]);
        if (!entitled) {
          entries.push({
            module_key: m.key, enabled: false, source: 'membership',
            reason_ar: MEMBERSHIP_BLOCK_AR, reason_en: MEMBERSHIP_BLOCK_EN,
          });
          sources.membership.push(m.key);
          continue;
        }
      }

      entries.push({
        module_key: m.key, enabled: true,
        source: adminOverridden ? 'admin_override' : 'default',
        reason_ar: ACTIVE_AR, reason_en: ACTIVE_EN,
      });
      (adminOverridden ? sources.admin_override : sources.default).push(m.key);
    }

    return {
      allowed: entries.filter(e => e.enabled).map(e => e.module_key),
      disabled: entries.filter(e => !e.enabled).map(e => e.module_key),
      entries,
      version: Date.now(),
      updated_at: input.now ?? new Date().toISOString(),
      sources,
    };
  } catch {
    return empty;
  }
}

export const ACCESS_LABELS = {
  active: { ar: ACTIVE_AR, en: ACTIVE_EN },
  membership_block: { ar: MEMBERSHIP_BLOCK_AR, en: MEMBERSHIP_BLOCK_EN },
  admin_disabled: { ar: ADMIN_DISABLED_AR, en: ADMIN_DISABLED_EN },
  business_suspended: { ar: SUSPENDED_REASON_AR, en: SUSPENDED_REASON_EN },
  synced: { ar: 'تمت المزامنة', en: 'Synced' },
} as const;