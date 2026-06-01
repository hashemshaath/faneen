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
