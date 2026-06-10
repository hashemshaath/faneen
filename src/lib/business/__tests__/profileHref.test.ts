import { describe, it, expect } from 'vitest';
import {
  RESERVED_USERNAME_SLUGS,
  getBusinessProfileHref,
  getBusinessProfileUrl,
  isReservedUsername,
  normalizeUsername,
} from '../profileHref';

describe('normalizeUsername', () => {
  it('lowercases and trims input', () => {
    expect(normalizeUsername('  AjaNetworking ')).toBe('ajanetworking');
  });

  it('decodes percent-encoded segments safely', () => {
    expect(normalizeUsername('aja%20networking')).toBe('aja networking');
  });

  it('tolerates malformed percent-encoding', () => {
    expect(normalizeUsername('aja%E0')).toBe('aja%e0');
  });

  it('returns empty string for nullish input', () => {
    expect(normalizeUsername(null)).toBe('');
    expect(normalizeUsername(undefined)).toBe('');
    expect(normalizeUsername('')).toBe('');
  });
});

describe('isReservedUsername', () => {
  it.each(['admin', 'Dashboard', '/quote', 'Q', 'CATEGORIES'])(
    'flags %s as reserved',
    (slug) => {
      expect(isReservedUsername(slug.replace(/^\//, ''))).toBe(true);
    },
  );

  it('does not flag real business usernames', () => {
    expect(isReservedUsername('ajanetworking')).toBe(false);
    expect(isReservedUsername('my-company')).toBe(false);
  });

  it('keeps the reserved list in sync with the documented routes', () => {
    for (const expected of ['admin', 'dashboard', 'quote', 'q', 'auth', 'search']) {
      expect(RESERVED_USERNAME_SLUGS.has(expected)).toBe(true);
    }
  });
});

describe('getBusinessProfileHref', () => {
  it('returns the canonical /<username> path', () => {
    expect(getBusinessProfileHref({ username: 'ajanetworking' })).toBe('/ajanetworking');
  });

  it('normalizes username case before linking', () => {
    expect(getBusinessProfileHref({ username: 'AjaNetworking' })).toBe('/ajanetworking');
  });

  it('appends branch slug when provided', () => {
    expect(getBusinessProfileHref({ username: 'aja' }, 'riyadh')).toBe('/aja/riyadh');
  });

  it('never produces a /q/ business link', () => {
    const href = getBusinessProfileHref({ username: 'aja' });
    expect(href).not.toMatch(/^\/q\//);
  });

  it('returns null when username is missing instead of /undefined', () => {
    expect(getBusinessProfileHref(null)).toBeNull();
    expect(getBusinessProfileHref({ username: '' })).toBeNull();
    expect(getBusinessProfileHref({ username: null })).toBeNull();
  });
});

describe('getBusinessProfileUrl', () => {
  it('produces absolute https URL for sharing/canonical', () => {
    expect(getBusinessProfileUrl({ username: 'aja' })).toBe('https://qitaat.com/aja');
  });

  it('returns null when username is missing', () => {
    expect(getBusinessProfileUrl({ username: null })).toBeNull();
  });
});