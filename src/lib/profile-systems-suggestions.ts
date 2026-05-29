/**
 * Pure, side-effect-free builder for /profile-systems search suggestions.
 * Extracted so it can be unit-tested without rendering React.
 */

export interface SuggestionProfile {
  id: string;
  slug: string;
  name_ar: string;
  name_en: string | null;
  category: string | null;
}

export interface SuggestionCategory {
  value: string;
  ar: string;
  en: string;
}

export type SuggestionKind = 'profile' | 'category' | 'spec';

export interface ProfileSuggestion {
  key: string;
  kind: SuggestionKind;
  label: string;
  sub?: string;
  /** Target slug for profile suggestions (navigation). */
  slug?: string;
  /** Category value for category suggestions. */
  categoryValue?: string;
  /** Spec filter identifier for spec suggestions. */
  specKey?: 'thermal' | 'sound' | 'strength' | 'premium';
}

export interface BuildOpts {
  language: 'ar' | 'en';
  categories: SuggestionCategory[];
  categoryCounts: Map<string, number>;
  limit?: number;
}

const norm = (s: string) => s.trim().toLowerCase();

const SPEC_HINTS: Array<{
  kw: string[];
  specKey: 'thermal' | 'sound' | 'strength' | 'premium';
  label: { ar: string; en: string };
}> = [
  { kw: ['ther', 'حرار', 'عزل حراري'], specKey: 'thermal', label: { ar: 'عزل حراري ≥ 7', en: 'Thermal ≥ 7' } },
  { kw: ['sound', 'صوت', 'عزل صوتي'], specKey: 'sound', label: { ar: 'عزل صوتي ≥ 7', en: 'Sound ≥ 7' } },
  { kw: ['stren', 'تحمل', 'قوة'], specKey: 'strength', label: { ar: 'تحمل ≥ 7', en: 'Strength ≥ 7' } },
  { kw: ['premium', 'احتر'], specKey: 'premium', label: { ar: 'احترافي فقط', en: 'Premium only' } },
];

export function buildProfileSuggestions(
  profiles: SuggestionProfile[],
  query: string,
  opts: BuildOpts,
): ProfileSuggestion[] {
  const q = norm(query);
  if (!q) return [];
  const limit = opts.limit ?? 8;
  const out: ProfileSuggestion[] = [];

  // Categories first — short, scannable, lets users pivot quickly.
  for (const c of opts.categories) {
    if (c.value === 'all') continue;
    if (norm(c.ar).includes(q) || norm(c.en).includes(q) || c.value.includes(q)) {
      const n = opts.categoryCounts.get(c.value) ?? 0;
      out.push({
        key: `cat-${c.value}`,
        kind: 'category',
        label: opts.language === 'ar' ? c.ar : c.en,
        sub: `${n} ${opts.language === 'ar' ? 'قطاع' : 'profiles'}`,
        categoryValue: c.value,
      });
    }
  }

  // Profile name matches.
  for (const p of profiles) {
    const hay = `${p.name_ar ?? ''} ${p.name_en ?? ''}`.toLowerCase();
    if (hay.includes(q)) {
      const co = opts.categories.find((c) => c.value === p.category);
      out.push({
        key: `p-${p.id}`,
        kind: 'profile',
        label: opts.language === 'ar' ? (p.name_ar || p.name_en || '') : (p.name_en || p.name_ar || ''),
        sub: co ? (opts.language === 'ar' ? co.ar : co.en) : (p.category ?? ''),
        slug: p.slug,
      });
    }
  }

  // Spec/property hints.
  for (const h of SPEC_HINTS) {
    if (h.kw.some((k) => q.includes(k))) {
      out.push({
        key: `sp-${h.specKey}`,
        kind: 'spec',
        label: opts.language === 'ar' ? h.label.ar : h.label.en,
        sub: opts.language === 'ar' ? 'تطبيق فلتر' : 'Apply filter',
        specKey: h.specKey,
      });
    }
  }

  return out.slice(0, limit);
}