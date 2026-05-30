/**
 * RFQ-BRAND-PICKER-1A — pure helpers for brand preference + lock semantics.
 * No I/O. No React. Safe to import from anywhere.
 */

export type BrandPreferenceMode = 'exact' | 'preferred' | 'flexible';
export type BrandLock = 'exact' | 'preferred' | 'flexible';

const MODES: readonly BrandPreferenceMode[] = ['exact', 'preferred', 'flexible'];
const LOCKS: readonly BrandLock[] = ['exact', 'preferred', 'flexible'];

export function isValidBrandPreferenceMode(v: unknown): v is BrandPreferenceMode {
  return typeof v === 'string' && (MODES as readonly string[]).includes(v);
}

export function isValidBrandLock(v: unknown): v is BrandLock {
  return typeof v === 'string' && (LOCKS as readonly string[]).includes(v);
}

/** Supplier may propose an equivalent brand only when the lock allows it. */
export function canSupplierProposeEquivalent(lock: BrandLock | null | undefined): boolean {
  if (lock == null) return true; // no lock set → equivalents allowed
  return lock !== 'exact';
}

export function describeBrandLock(
  lock: BrandLock | null | undefined,
  lang: 'ar' | 'en',
): string {
  const map: Record<BrandLock, { ar: string; en: string }> = {
    exact:     { ar: 'مطابق تمامًا — لا يُسمح ببدائل', en: 'Exact — no alternatives' },
    preferred: { ar: 'مفضّل — تُقبل البدائل المعتمدة', en: 'Preferred — equivalents accepted' },
    flexible:  { ar: 'مرن — أي بديل مناسب',           en: 'Flexible — any suitable alternative' },
  };
  if (!lock) return lang === 'ar' ? 'غير محدد' : 'Not set';
  return map[lock][lang];
}

export function describeBrandPreference(
  mode: BrandPreferenceMode | null | undefined,
  lang: 'ar' | 'en',
): string {
  const map: Record<BrandPreferenceMode, { ar: string; en: string }> = {
    exact:     { ar: 'علامة محددة فقط', en: 'Specific brand only' },
    preferred: { ar: 'مفضّلة مع بدائل',  en: 'Preferred, equivalents OK' },
    flexible:  { ar: 'أي علامة مناسبة',  en: 'Any suitable brand' },
  };
  if (!mode) return lang === 'ar' ? 'بدون تفضيل' : 'No preference';
  return map[mode][lang];
}