import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

/* ============================================================
 * RTL/LTR direction utilities — single source of truth.
 * Used by components and audit tests. Pure (no React) helpers
 * live here so they can be unit-tested in isolation.
 * ============================================================ */

export const RTL_LANGS = ['ar', 'he', 'fa', 'ur'] as const;

/** Matches purely technical content that must render LTR
 *  (reference IDs, UUIDs, emails, URLs, API keys, phone in international form). */
export const TECHNICAL_LTR_PATTERN =
  /^(?:[A-Z]{2,5}-\d{6,}|[\w-]{8,}-[\w-]{4,}-[\w-]{4,}-[\w-]{4,}-[\w-]{12,}|https?:\/\/\S+|[\w.+-]+@[\w-]+\.[\w.-]+|\+?\d[\d\s-]{6,}|[A-Za-z0-9_-]{20,})$/;

/** Reference ID prefixes that must always render LTR. */
export const REFERENCE_ID_PREFIXES = [
  'USR', 'ADM', 'ENT', 'BIZ', 'STF', 'LOC', 'QTE', 'LED', 'LR',
  'BKG', 'BK',  'PAY', 'INV', 'CRN', 'STI', 'EAR', 'PVS',
] as const;

export const REFERENCE_ID_PATTERN = new RegExp(
  `^(?:${REFERENCE_ID_PREFIXES.join('|')})-\\d{6,}$`
);

const stripLocale = (input: string): string =>
  (input || '').toLowerCase().split(/[-_]/)[0];

/** Returns 'rtl' for Arabic / Hebrew / Farsi / Urdu, else 'ltr'. */
export function getDirection(languageOrLocale: string | null | undefined): 'rtl' | 'ltr' {
  const lang = stripLocale(languageOrLocale ?? '');
  return (RTL_LANGS as readonly string[]).includes(lang) ? 'rtl' : 'ltr';
}

/** True when the supplied language/locale renders right-to-left. */
export function isRTL(languageOrLocale: string | null | undefined): boolean {
  return getDirection(languageOrLocale) === 'rtl';
}

/** Canonical two-letter <html lang> value the project speaks (ar | en). */
export function getDocumentLang(languageOrLocale: string | null | undefined): 'ar' | 'en' {
  const lang = stripLocale(languageOrLocale ?? '');
  return lang === 'ar' ? 'ar' : 'en';
}

/** Logical alignment helper for inline use. */
export function getLogicalAlign(_isRTL?: boolean): { start: 'text-start'; end: 'text-end' } {
  return { start: 'text-start', end: 'text-end' };
}

/** True when a value should be rendered LTR regardless of UI direction. */
export function isTechnicalValue(value: string | null | undefined): boolean {
  if (!value) return false;
  const v = String(value).trim();
  if (!v) return false;
  return TECHNICAL_LTR_PATTERN.test(v) || REFERENCE_ID_PATTERN.test(v);
}

export const getLocalizedValue = (
  language: string,
  arabic?: string | null,
  english?: string | null,
  fallback = "",
) => {
  if (language === "ar") return arabic || english || fallback;
  return english || arabic || fallback;
};

export const useDirection = () => {
  const { language, isRTL, dir } = useLanguage();

  return {
    language,
    isRTL,
    dir,
    BackIcon: isRTL ? ArrowRight : ArrowLeft,
    PrevIcon: isRTL ? ChevronRight : ChevronLeft,
    NextIcon: isRTL ? ChevronLeft : ChevronRight,
  };
};
