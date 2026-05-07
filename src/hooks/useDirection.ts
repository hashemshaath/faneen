/**
 * useDirection — single source of truth for layout direction.
 * Wraps the LanguageContext to expose a stable, framework-agnostic API
 * usable across components without coupling to translation keys.
 */
import { useLanguage } from '@/i18n/LanguageContext';

export interface DirectionApi {
  /** 'rtl' | 'ltr' — current document direction */
  dir: 'rtl' | 'ltr';
  /** Convenience boolean */
  isRTL: boolean;
  /** Convenience boolean */
  isLTR: boolean;
  /** Picks one of two values based on direction. */
  pick: <T>(rtlValue: T, ltrValue: T) => T;
  /** Returns 'start' / 'end' aware spacing/positioning helpers. */
  start: 'left' | 'right';
  end: 'left' | 'right';
}

export function useDirection(): DirectionApi {
  const { dir, isRTL } = useLanguage();
  return {
    dir,
    isRTL,
    isLTR: !isRTL,
    pick: <T,>(rtlValue: T, ltrValue: T): T => (isRTL ? rtlValue : ltrValue),
    start: isRTL ? 'right' : 'left',
    end: isRTL ? 'left' : 'right',
  };
}

export const isRTL = (): boolean =>
  typeof document !== 'undefined' && document.documentElement.dir === 'rtl';
