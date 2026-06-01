/**
 * STAB-1G: Central profile display-name resolver.
 *
 * Privacy-first: by default neither `email` nor `ref_id` is used as a
 * fallback. Callers must opt-in explicitly via options. This protects
 * public surfaces from accidentally leaking contact info or internal
 * identifiers when localized name + username are missing.
 *
 * Per-surface policy (STAB-1G):
 *   - Public:       name → username → emptyFallback        (no email/ref_id)
 *   - Internal:     name → username → ref_id → emptyFallback
 *   - Admin/Support: name → username → email → ref_id → emptyFallback
 *   - Invitation:   invitedName → username → email → emptyFallback
 *
 * Never use this helper for authorization decisions — display only.
 */

export interface ProfileDisplayFields {
  full_name_ar?: string | null;
  full_name_en?: string | null;
  full_name?: string | null;
  username?: string | null;
  email?: string | null;
  ref_id?: string | null;
}

export type DisplayNameLocale = 'ar' | 'en' | 'neutral';

export interface GetProfileDisplayNameOptions {
  /** Preferred locale for the localized name. Defaults to 'ar'. */
  locale?: DisplayNameLocale;
  /** Allow `email` as a fallback. Default: false. */
  allowEmailFallback?: boolean;
  /** Allow `ref_id` as a fallback. Default: false. */
  allowRefIdFallback?: boolean;
  /**
   * Hard block on private fields regardless of the two flags above.
   * Use for public-facing surfaces. Default: false.
   */
  publicSafe?: boolean;
  /** String returned when every allowed fallback is empty. Default: ''. */
  emptyFallback?: string;
}

function pick(...values: Array<string | null | undefined>): string {
  for (const v of values) {
    if (typeof v === 'string' && v.trim().length > 0) return v.trim();
  }
  return '';
}

/**
 * Resolve the best display name for a profile.
 * Accepts either a legacy `'ar' | 'en'` locale string or a full options
 * object. With a bare locale string the helper preserves the legacy
 * STAB-1E behavior (email + ref_id fallback allowed) so existing
 * callsites are unaffected. New callsites should pass options to opt
 * into the appropriate surface policy.
 */
export function getProfileDisplayName(
  profile: ProfileDisplayFields | null | undefined,
  localeOrOptions: DisplayNameLocale | GetProfileDisplayNameOptions = 'ar',
): string {
  // Legacy positional-locale call → preserve STAB-1E behavior verbatim.
  if (typeof localeOrOptions === 'string') {
    return resolveDisplayName(profile, {
      locale: localeOrOptions,
      allowEmailFallback: true,
      allowRefIdFallback: true,
      publicSafe: false,
      emptyFallback: '',
    });
  }
  return resolveDisplayName(profile, {
    locale: localeOrOptions.locale ?? 'ar',
    allowEmailFallback: localeOrOptions.allowEmailFallback ?? false,
    allowRefIdFallback: localeOrOptions.allowRefIdFallback ?? false,
    publicSafe: localeOrOptions.publicSafe ?? false,
    emptyFallback: localeOrOptions.emptyFallback ?? '',
  });
}

function localizedChain(
  profile: ProfileDisplayFields,
  locale: DisplayNameLocale,
): Array<string | null | undefined> {
  if (locale === 'en') {
    return [profile.full_name_en, profile.full_name, profile.full_name_ar];
  }
  if (locale === 'neutral') {
    return [profile.full_name_ar, profile.full_name_en, profile.full_name];
  }
  return [profile.full_name_ar, profile.full_name, profile.full_name_en];
}

function resolveDisplayName(
  profile: ProfileDisplayFields | null | undefined,
  opts: Required<GetProfileDisplayNameOptions>,
): string {
  if (!profile) return opts.emptyFallback;

  const chain: Array<string | null | undefined> = [
    ...localizedChain(profile, opts.locale),
    profile.username,
  ];

  if (!opts.publicSafe) {
    if (opts.allowEmailFallback) chain.push(profile.email);
    if (opts.allowRefIdFallback) chain.push(profile.ref_id);
  }

  return pick(...chain) || opts.emptyFallback;
}

/** First character of the resolved display name, uppercase. */
export function getProfileInitial(
  profile: ProfileDisplayFields | null | undefined,
  localeOrOptions: DisplayNameLocale | GetProfileDisplayNameOptions = 'ar',
): string {
  const name = getProfileDisplayName(profile, localeOrOptions);
  return (name || '?').charAt(0).toUpperCase();
}