/**
 * AUTH-EMAIL-PHONE-VERIFY-2
 * ─────────────────────────
 * Centralized helpers for distinguishing internal synthetic phone-login
 * auth emails (e.g. `966506315300@phone.qitaat.local`) from the user's
 * official, user-facing email stored on `profiles.email`.
 *
 * Rules enforced project-wide:
 * - Synthetic emails ending in `@phone.qitaat.local` are INTERNAL ONLY.
 * - They must never be displayed as the user's official email.
 * - Transactional emails must never be delivered to them.
 * - `profiles.email` is the single source of truth for the official email.
 */

export const SYNTHETIC_PHONE_EMAIL_DOMAIN = 'phone.qitaat.local';

const SYNTHETIC_SUFFIX = `@${SYNTHETIC_PHONE_EMAIL_DOMAIN}`;

/** Returns true when `email` is a synthetic phone-login auth identifier. */
export function isSyntheticPhoneEmail(email?: string | null): boolean {
  if (!email) return false;
  return email.toLowerCase().endsWith(SYNTHETIC_SUFFIX);
}

function isLikelyValidEmail(email: string): boolean {
  // Minimal RFC-ish check sufficient for UI display gating.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export interface ResolveEmailInput {
  authEmail?: string | null;
  profileEmail?: string | null;
}

/**
 * Returns the email to show in user-facing surfaces, or `null` when only a
 * synthetic auth email exists (callers should render a "Not provided" state).
 *
 * Preference order:
 *  1. `profileEmail` (if valid and not synthetic)
 *  2. `authEmail`     (if valid and not synthetic)
 *  3. `null`
 */
export function getDisplayEmail({ authEmail, profileEmail }: ResolveEmailInput): string | null {
  if (profileEmail && isLikelyValidEmail(profileEmail) && !isSyntheticPhoneEmail(profileEmail)) {
    return profileEmail;
  }
  if (authEmail && isLikelyValidEmail(authEmail) && !isSyntheticPhoneEmail(authEmail)) {
    return authEmail;
  }
  return null;
}

/**
 * Returns the address to use as a transactional-email recipient, or `null`
 * when no deliverable address exists (caller should suppress email send and
 * fall back to an in-app notification with `reason: missing_official_email`).
 *
 * Same preference order as `getDisplayEmail` — synthetic identifiers are
 * never returned.
 */
export function getEmailDeliveryAddress({ authEmail, profileEmail }: ResolveEmailInput): string | null {
  return getDisplayEmail({ authEmail, profileEmail });
}

/**
 * Reason code logged when transactional email delivery is suppressed because
 * no official email is available. Standardized so audit/log aggregation can
 * group these safely.
 */
export const MISSING_OFFICIAL_EMAIL_REASON = 'missing_official_email' as const;