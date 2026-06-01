/**
 * STAB-1E: central membership tier label/utility helpers.
 *
 * Single source of truth for how membership tiers are displayed and
 * compared in the UI. Pure helpers — no Supabase imports, no React.
 *
 * The tier enum is defined in the database as
 *   `'free' | 'basic' | 'premium' | 'enterprise'`
 * and re-exported as `MembershipTier` from the subscriptions service.
 * Labels and ordering preserve current UI behavior verbatim.
 */

import type { MembershipTier } from '../services/subscriptions/setBusinessMembershipTier';

export type Locale = 'ar' | 'en';

type LabelMap = Record<MembershipTier, { ar: string; en: string }>;

const TIER_LABELS: LabelMap = {
  free: { ar: 'مجاني', en: 'Free' },
  basic: { ar: 'أساسي', en: 'Basic' },
  premium: { ar: 'مميز', en: 'Premium' },
  enterprise: { ar: 'مؤسسي', en: 'Enterprise' },
};

const TIER_ORDER: Record<MembershipTier, number> = {
  free: 0,
  basic: 1,
  premium: 2,
  enterprise: 3,
};

const KNOWN_TIERS: ReadonlySet<string> = new Set(Object.keys(TIER_ORDER));

/**
 * Normalize an unknown tier value into a known `MembershipTier` or null.
 * Trims, lowercases, then matches against the enum. Useful for guarding
 * data coming from external sources before passing it to compare/label
 * helpers without surprising callers.
 */
export function normalizeMembershipTier(
  tier: MembershipTier | string | null | undefined,
): MembershipTier | null {
  if (tier == null) return null;
  const key = String(tier).trim().toLowerCase();
  return KNOWN_TIERS.has(key) ? (key as MembershipTier) : null;
}

/** Return the localized label for a tier, falling back to the raw token. */
export function getMembershipTierLabel(
  tier: MembershipTier | string | null | undefined,
  locale: Locale = 'ar',
): string {
  if (!tier) return '';
  const key = String(tier) as MembershipTier;
  const entry = TIER_LABELS[key];
  if (!entry) return String(tier);
  return entry[locale];
}

/**
 * shadcn Badge variant for a tier. Returns one of the standard variants
 * (`default`, `secondary`, `outline`) — kept conservative to match
 * existing inline usages where premium/enterprise read as `default`.
 */
export function getMembershipTierBadgeVariant(
  tier: MembershipTier | string | null | undefined,
): 'default' | 'secondary' | 'outline' {
  const key = String(tier ?? '') as MembershipTier;
  if (key === 'premium' || key === 'enterprise') return 'default';
  if (key === 'basic') return 'secondary';
  return 'outline';
}

/** Canonical upgrade route shown across the dashboard. */
export function getMembershipUpgradePath(): string {
  return '/membership';
}

/** @deprecated Use `getMembershipUpgradePath()` — kept for backward compat. */
export const getUpgradePath = getMembershipUpgradePath;

/**
 * Compare two tiers. Returns:
 *   negative if `a` < `b`,
 *   0 if equal,
 *   positive if `a` > `b`.
 * Unknown tiers are treated as the lowest possible rank (-1) so that
 * `isTierAtLeast` is conservative (denies access on bad input).
 */
export function compareMembershipTiers(
  a: MembershipTier | string | null | undefined,
  b: MembershipTier | string | null | undefined,
): number {
  const ra = a && KNOWN_TIERS.has(String(a)) ? TIER_ORDER[a as MembershipTier] : -1;
  const rb = b && KNOWN_TIERS.has(String(b)) ? TIER_ORDER[b as MembershipTier] : -1;
  return ra - rb;
}

/** True when `currentTier` meets or exceeds `requiredTier`. */
export function isTierAtLeast(
  currentTier: MembershipTier | string | null | undefined,
  requiredTier: MembershipTier | string | null | undefined,
): boolean {
  return compareMembershipTiers(currentTier, requiredTier) >= 0;
}
