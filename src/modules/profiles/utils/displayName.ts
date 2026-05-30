/**
 * Central profile display-name resolver — single source of truth for
 * how an identity is shown in the UI. Always prefer localized fields,
 * then the legacy compatibility field, then handle, then email, then
 * ref_id. Never use email/handle/name for authorization — only display.
 */

export interface ProfileDisplayFields {
  full_name_ar?: string | null;
  full_name_en?: string | null;
  full_name?: string | null;
  username?: string | null;
  email?: string | null;
  ref_id?: string | null;
}

function pick(...values: Array<string | null | undefined>): string {
  for (const v of values) {
    if (typeof v === 'string' && v.trim().length > 0) return v.trim();
  }
  return '';
}

/**
 * Resolve the best display name for a profile.
 * @param profile - profile-like object (any subset of identity fields)
 * @param locale  - 'ar' | 'en' — picks the localized field first
 */
export function getProfileDisplayName(
  profile: ProfileDisplayFields | null | undefined,
  locale: 'ar' | 'en' = 'ar',
): string {
  if (!profile) return '';
  if (locale === 'en') {
    return pick(
      profile.full_name_en,
      profile.full_name,
      profile.full_name_ar,
      profile.username,
      profile.email,
      profile.ref_id,
    );
  }
  return pick(
    profile.full_name_ar,
    profile.full_name,
    profile.full_name_en,
    profile.username,
    profile.email,
    profile.ref_id,
  );
}

/** First character of the resolved display name, uppercase. */
export function getProfileInitial(
  profile: ProfileDisplayFields | null | undefined,
  locale: 'ar' | 'en' = 'ar',
): string {
  const name = getProfileDisplayName(profile, locale);
  return (name || '?').charAt(0).toUpperCase();
}