import { describe, it, expect } from 'vitest';
import {
  buildProfileSuggestions,
  type SuggestionProfile,
  type SuggestionCategory,
} from '../profile-systems-suggestions';

const CATEGORIES: SuggestionCategory[] = [
  { value: 'all', ar: 'الكل', en: 'All' },
  { value: 'aluminum', ar: 'الألمنيوم', en: 'Aluminum' },
  { value: 'glass', ar: 'الزجاج', en: 'Glass' },
  { value: 'wood', ar: 'الخشب', en: 'Wood' },
];

const PROFILES: SuggestionProfile[] = [
  { id: '1', slug: 'alumil-m9660', name_ar: 'ألوميل M9660', name_en: 'Alumil M9660', category: 'aluminum' },
  { id: '2', slug: 'schueco-aws-75', name_ar: 'شوكو AWS 75', name_en: 'Schueco AWS 75', category: 'aluminum' },
  { id: '3', slug: 'tempered-glass-x', name_ar: 'زجاج مقسى X', name_en: 'Tempered Glass X', category: 'glass' },
];

const COUNTS = new Map<string, number>([
  ['aluminum', 2],
  ['glass', 1],
  ['wood', 0],
]);

const baseOpts = { language: 'ar' as const, categories: CATEGORIES, categoryCounts: COUNTS };

describe('buildProfileSuggestions', () => {
  it('returns no suggestions for empty query', () => {
    expect(buildProfileSuggestions(PROFILES, '', baseOpts)).toEqual([]);
    expect(buildProfileSuggestions(PROFILES, '   ', baseOpts)).toEqual([]);
  });

  it('matches Arabic category names', () => {
    const out = buildProfileSuggestions(PROFILES, 'الألم', baseOpts);
    expect(out.some((s) => s.kind === 'category' && s.categoryValue === 'aluminum')).toBe(true);
  });

  it('matches English category names case-insensitively', () => {
    const out = buildProfileSuggestions(PROFILES, 'GLASS', { ...baseOpts, language: 'en' });
    expect(out.some((s) => s.kind === 'category' && s.categoryValue === 'glass')).toBe(true);
  });

  it('matches profile names and carries the slug for navigation', () => {
    const out = buildProfileSuggestions(PROFILES, 'alumil', baseOpts);
    const hit = out.find((s) => s.kind === 'profile');
    expect(hit?.slug).toBe('alumil-m9660');
  });

  it('returns spec hint when query contains a thermal keyword', () => {
    const out = buildProfileSuggestions(PROFILES, 'حراري', baseOpts);
    const spec = out.find((s) => s.kind === 'spec' && s.specKey === 'thermal');
    expect(spec).toBeDefined();
  });

  it('returns spec hint for sound keyword in English', () => {
    const out = buildProfileSuggestions(PROFILES, 'sound', { ...baseOpts, language: 'en' });
    expect(out.some((s) => s.specKey === 'sound')).toBe(true);
  });

  it('returns spec hint for premium keyword', () => {
    const out = buildProfileSuggestions(PROFILES, 'premium', { ...baseOpts, language: 'en' });
    expect(out.some((s) => s.specKey === 'premium')).toBe(true);
  });

  it('respects the limit parameter', () => {
    const out = buildProfileSuggestions(PROFILES, 'a', { ...baseOpts, limit: 2 });
    expect(out.length).toBeLessThanOrEqual(2);
  });

  it('excludes the "all" category', () => {
    const out = buildProfileSuggestions(PROFILES, 'كل', baseOpts);
    expect(out.some((s) => s.categoryValue === 'all')).toBe(false);
  });

  it('returns empty result for a non-matching query', () => {
    const out = buildProfileSuggestions(PROFILES, 'zzznomatch', baseOpts);
    expect(out).toEqual([]);
  });

  it('includes category-count subtitle text', () => {
    const out = buildProfileSuggestions(PROFILES, 'aluminum', { ...baseOpts, language: 'en' });
    const cat = out.find((s) => s.kind === 'category' && s.categoryValue === 'aluminum');
    expect(cat?.sub).toContain('2');
  });

  it('produces stable keys per item kind', () => {
    const out = buildProfileSuggestions(PROFILES, 'a', baseOpts);
    const keys = out.map((s) => s.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});