/**
 * Canonical helper for building public business profile links.
 *
 * Use this everywhere the app links to a business profile so that:
 *   - all links resolve through `/<username>` (never `/business/<username>`
 *     or `/q/<username>`),
 *   - missing usernames degrade safely (no broken `/undefined` links),
 *   - branch links are produced consistently via a single code path.
 */

export const RESERVED_USERNAME_SLUGS: ReadonlySet<string> = new Set([
  'about', 'admin', 'api', 'auth', 'blog', 'branch', 'brands', 'business',
  'categories', 'claim', 'client', 'compare', 'compare-profiles', 'contact',
  'contracts', 'dashboard', 'diagnostics', 'for-providers', 'forbidden',
  'guides', 'help', 'invite', 'join', 'join-as-provider', 'membership',
  'notifications', 'offers', 'onboarding', 'privacy', 'private-sectors',
  'profile-systems', 'projects', 'providers', 'q', 'quote', 'r', 'rentals',
  'reset-password', 's', 'search', 'sector', 'sectors', 'services', 'showcase',
  'staff-invite', 'terms', 'unsubscribe', 'v',
]);

export interface BusinessLike {
  username?: string | null;
}

/**
 * Normalize a username segment from a URL or DB row.
 *   - decodes percent-encoding safely
 *   - trims whitespace
 *   - lowercases (usernames are stored lowercase)
 * Returns `''` for nullish / invalid input.
 */
export function normalizeUsername(raw: string | null | undefined): string {
  if (!raw) return '';
  let value = String(raw).trim();
  try {
    value = decodeURIComponent(value);
  } catch {
    // malformed sequence — keep the trimmed input
  }
  return value.trim().toLowerCase();
}

/** True when `slug` collides with a reserved top-level route. */
export function isReservedUsername(slug: string | null | undefined): boolean {
  const norm = normalizeUsername(slug);
  return !!norm && RESERVED_USERNAME_SLUGS.has(norm);
}

/**
 * Builds the canonical href for a business profile.
 * Falls back to `null` when no username is available so callers can render
 * a non-link instead of a broken `/undefined` href.
 */
export function getBusinessProfileHref(
  business: BusinessLike | null | undefined,
  branchSlug?: string | null,
): string | null {
  const username = normalizeUsername(business?.username);
  if (!username) return null;
  const branch = (branchSlug ?? '').trim();
  return branch ? `/${username}/${branch}` : `/${username}`;
}

/** Absolute (public) variant used for share/canonical URLs. */
export function getBusinessProfileUrl(
  business: BusinessLike | null | undefined,
  branchSlug?: string | null,
  origin: string = 'https://qitaat.com',
): string | null {
  const path = getBusinessProfileHref(business, branchSlug);
  return path ? `${origin}${path}` : null;
}