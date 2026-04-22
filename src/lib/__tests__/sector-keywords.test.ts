import { describe, it, expect } from 'vitest';
import {
  SECTOR_KEYWORDS,
  ALL_SECTORS,
  getSectorKeywords,
  getSectorMeta,
  detectSectorFromQuery,
  detectSectorFromCategorySlug,
  normalizeArabic,
} from '@/lib/sector-keywords';

describe('sector-keywords', () => {
  it('exposes all 5 expected sectors', () => {
    expect(ALL_SECTORS).toHaveLength(5);
    expect(Object.keys(SECTOR_KEYWORDS).sort()).toEqual(
      ['aluminum', 'cabinets', 'glass', 'iron', 'wood'],
    );
  });

  it('every sector has bilingual content + ≥8 keywords each', () => {
    for (const s of ALL_SECTORS) {
      expect(s.name_ar.length).toBeGreaterThan(0);
      expect(s.name_en.length).toBeGreaterThan(0);
      expect(s.tagline_ar.length).toBeLessThanOrEqual(80);
      expect(s.tagline_en.length).toBeLessThanOrEqual(80);
      expect(s.description_ar.length).toBeGreaterThanOrEqual(120);
      expect(s.description_ar.length).toBeLessThanOrEqual(200);
      expect(s.keywords_ar.length).toBeGreaterThanOrEqual(8);
      expect(s.keywords_en.length).toBeGreaterThanOrEqual(8);
    }
  });

  it('getSectorKeywords merges AR+EN and de-duplicates', () => {
    const merged = getSectorKeywords('aluminum');
    const parts = merged.split(', ');
    expect(parts).toContain('ألمنيوم');
    expect(parts).toContain('aluminum');
    expect(new Set(parts).size).toBe(parts.length); // no duplicates
  });

  it('getSectorMeta returns localized title/description/tagline', () => {
    const ar = getSectorMeta('glass', true);
    expect(ar.title).toContain('الزجاج');
    expect(ar.title).toContain('قِطاعات');
    expect(ar.description).toMatch(/زجاج/);
    expect(ar.tagline.length).toBeGreaterThan(0);

    const en = getSectorMeta('glass', false);
    expect(en.title).toContain('Glass');
    expect(en.title).toContain('Qitaat');
    expect(en.description).toMatch(/glass/i);
  });

  it('detectSectorFromQuery matches Arabic & English queries', () => {
    expect(detectSectorFromQuery('ألمنيوم')).toBe('aluminum');
    expect(detectSectorFromQuery('aluminum doors')).toBe('aluminum');
    expect(detectSectorFromQuery('تركيب درابزين حديد')).toBe('iron');
    expect(detectSectorFromQuery('tempered glass')).toBe('glass');
    expect(detectSectorFromQuery('باركيه')).toBe('wood');
    expect(detectSectorFromQuery('kitchen cabinets')).toBe('cabinets');
    expect(detectSectorFromQuery('مطابخ ألمنيوم')).not.toBeNull(); // matches one of them
  });

  it('detectSectorFromQuery returns null for unrelated/empty queries', () => {
    expect(detectSectorFromQuery('')).toBeNull();
    expect(detectSectorFromQuery('   ')).toBeNull();
    expect(detectSectorFromQuery('xyz random nonsense 12345')).toBeNull();
  });

  it('relatedSlugs all reference valid sectors', () => {
    for (const s of ALL_SECTORS) {
      for (const rel of s.relatedSlugs) {
        expect(SECTOR_KEYWORDS[rel]).toBeDefined();
        expect(rel).not.toBe(s.slug); // no self-reference
      }
    }
  });

  it('detectSectorFromCategorySlug maps real DB slugs to sectors', () => {
    // explicit map
    expect(detectSectorFromCategorySlug('aluminum')).toBe('aluminum');
    expect(detectSectorFromCategorySlug('aluminum-windows')).toBe('aluminum');
    expect(detectSectorFromCategorySlug('aluminum-facades')).toBe('aluminum');
    expect(detectSectorFromCategorySlug('iron-steel')).toBe('iron');
    expect(detectSectorFromCategorySlug('securit-glass')).toBe('glass');
    expect(detectSectorFromCategorySlug('double-glass')).toBe('glass');
    expect(detectSectorFromCategorySlug('mirrors')).toBe('glass');
    expect(detectSectorFromCategorySlug('wood-cabinets')).toBe('cabinets');
    // graceful fallback
    expect(detectSectorFromCategorySlug(null)).toBeNull();
    expect(detectSectorFromCategorySlug('')).toBeNull();
    expect(detectSectorFromCategorySlug('handles')).toBeNull();
  });

  describe('normalizeArabic', () => {
    it('strips diacritics and tatweel', () => {
      expect(normalizeArabic('الأَلُمنيُوم')).toBe('المنيوم');
      expect(normalizeArabic('حـــديد')).toBe('حديد');
    });
    it('unifies hamza, alef-maksura, ta-marbuta', () => {
      expect(normalizeArabic('إألمنيوم')).toBe('المنيوم');
      expect(normalizeArabic('مرايى')).toBe('مرايي');
      expect(normalizeArabic('نجارة')).toBe('نجاره');
    });
    it('drops the "ال" definite article', () => {
      expect(normalizeArabic('الزجاج')).toBe('زجاج');
      expect(normalizeArabic('الخشب الطبيعي')).toBe('خشب طبيعي');
    });
    it('returns empty for empty / null-like input', () => {
      expect(normalizeArabic('')).toBe('');
      expect(normalizeArabic('   ')).toBe('');
    });
  });

  describe('detectSectorFromQuery — Arabic robustness', () => {
    it('matches diacritized & alef variants', () => {
      expect(detectSectorFromQuery('أَلُمنيُوم')).toBe('aluminum');
      expect(detectSectorFromQuery('الإلمنيوم')).toBe('aluminum');
      expect(detectSectorFromQuery('زجـــاج سيكوريت')).toBe('glass');
    });
    it('matches common synonyms / misspellings', () => {
      expect(detectSectorFromQuery('المنيوم')).toBe('aluminum');
      expect(detectSectorFromQuery('الومنيوم')).toBe('aluminum');
      expect(detectSectorFromQuery('كلادنج')).toBe('aluminum');
      expect(detectSectorFromQuery('سكوريت')).toBe('glass');
      expect(detectSectorFromQuery('دواليب غرف')).toBe('cabinets');
      expect(detectSectorFromQuery('حداد فني')).toBe('iron');
      expect(detectSectorFromQuery('ام دي اف')).toBe('wood');
    });
    it('matches ta-marbuta variants ("نجارة" → wood)', () => {
      expect(detectSectorFromQuery('نجارة')).toBe('wood');
      expect(detectSectorFromQuery('ورشة نجاره')).toBe('wood');
    });
  });
});
