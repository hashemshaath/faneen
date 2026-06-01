import { describe, it, expect } from 'vitest';
import { getProfileDisplayName, getProfileInitial } from '../displayName';

describe('getProfileDisplayName', () => {
  it('prefers full_name_ar in Arabic', () => {
    expect(
      getProfileDisplayName(
        { full_name_ar: 'محمد', full_name_en: 'Mohammed', full_name: 'm', username: 'mo', email: 'm@x.io', ref_id: 'USR-1' },
        'ar',
      ),
    ).toBe('محمد');
  });

  it('prefers full_name_en in English', () => {
    expect(
      getProfileDisplayName(
        { full_name_ar: 'محمد', full_name_en: 'Mohammed', full_name: 'm', username: 'mo', email: 'm@x.io', ref_id: 'USR-1' },
        'en',
      ),
    ).toBe('Mohammed');
  });

  it('falls back from localized name to legacy full_name', () => {
    expect(getProfileDisplayName({ full_name: 'Legacy' }, 'ar')).toBe('Legacy');
    expect(getProfileDisplayName({ full_name: 'Legacy' }, 'en')).toBe('Legacy');
  });

  it('falls back to opposite-locale name when current locale missing', () => {
    expect(getProfileDisplayName({ full_name_en: 'Mohammed' }, 'ar')).toBe('Mohammed');
    expect(getProfileDisplayName({ full_name_ar: 'محمد' }, 'en')).toBe('محمد');
  });

  it('falls back to username, then email, then ref_id', () => {
    expect(getProfileDisplayName({ username: 'mo' })).toBe('mo');
    expect(getProfileDisplayName({ email: 'm@x.io' })).toBe('m@x.io');
    expect(getProfileDisplayName({ ref_id: 'USR-1' })).toBe('USR-1');
  });

  it('trims and skips empty strings', () => {
    expect(
      getProfileDisplayName({ full_name_ar: '   ', full_name_en: '  Mohammed  ', username: 'mo' }, 'ar'),
    ).toBe('Mohammed');
  });

  it('handles null/undefined profile safely', () => {
    expect(getProfileDisplayName(null)).toBe('');
    expect(getProfileDisplayName(undefined)).toBe('');
  });

  it('initial returns uppercase first character or ?', () => {
    expect(getProfileInitial({ full_name_en: 'mohammed' }, 'en')).toBe('M');
    expect(getProfileInitial(null)).toBe('?');
  });
});

describe('getProfileDisplayName — STAB-1G surface policies', () => {
  const profile = {
    full_name_ar: '',
    full_name_en: '',
    full_name: '',
    username: '',
    email: 'm@x.io',
    ref_id: 'USR-1',
  };

  it('public-safe blocks email and ref_id', () => {
    expect(
      getProfileDisplayName(profile, {
        locale: 'ar',
        publicSafe: true,
        emptyFallback: 'مستخدم',
      }),
    ).toBe('مستخدم');
  });

  it('publicSafe overrides explicit allow flags', () => {
    expect(
      getProfileDisplayName(profile, {
        publicSafe: true,
        allowEmailFallback: true,
        allowRefIdFallback: true,
        emptyFallback: 'User',
        locale: 'en',
      }),
    ).toBe('User');
  });

  it('internal mode allows ref_id but not email by default', () => {
    expect(
      getProfileDisplayName(profile, {
        locale: 'ar',
        allowRefIdFallback: true,
        emptyFallback: 'بدون اسم',
      }),
    ).toBe('USR-1');
  });

  it('admin/support mode allows email when enabled', () => {
    expect(
      getProfileDisplayName(
        { ...profile, ref_id: null },
        {
          locale: 'ar',
          allowEmailFallback: true,
          emptyFallback: 'بدون اسم',
        },
      ),
    ).toBe('m@x.io');
  });

  it('emptyFallback returned when no allowed field resolves', () => {
    expect(
      getProfileDisplayName(
        { username: '', email: 'x@y.io', ref_id: 'USR-2' },
        { locale: 'ar', emptyFallback: 'بدون اسم' },
      ),
    ).toBe('بدون اسم');
  });

  it('admin/support exposes ref_id when explicitly enabled', () => {
    expect(
      getProfileDisplayName(profile, {
        locale: 'en',
        allowEmailFallback: true,
        allowRefIdFallback: true,
      }),
    ).toBe('m@x.io'); // email comes before ref_id in chain
  });

  it('legacy positional locale call still permits email/ref_id', () => {
    expect(getProfileDisplayName({ email: 'm@x.io' }, 'ar')).toBe('m@x.io');
    expect(getProfileDisplayName({ ref_id: 'USR-1' }, 'en')).toBe('USR-1');
  });

  it('null profile returns emptyFallback', () => {
    expect(getProfileDisplayName(null, { emptyFallback: 'مستخدم' })).toBe('مستخدم');
  });

  it('neutral locale prefers Arabic name when both present', () => {
    expect(
      getProfileDisplayName(
        { full_name_ar: 'محمد', full_name_en: 'Mohammed' },
        { locale: 'neutral' },
      ),
    ).toBe('محمد');
  });
});
