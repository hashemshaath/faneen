/**
 * Bilingual primitives — single source of truth for AR/EN text rendering.
 *
 * Usage:
 *   <Bi ar="إضافة" en="Add" />               // inline span text
 *   <Bi as="h2" ar="..." en="..." />          // custom tag
 *   const bi = useBi(); bi('إضافة','Add');    // string in props (placeholder, toast, aria)
 *   pickBi(isRTL, ar, en)                     // pure helper outside React
 *
 * Replaces the verbose `{isRTL ? 'ar' : 'en'}` ternary scattered across the app.
 */
import React from 'react';
import { useLanguage } from '@/i18n/LanguageContext';

export const pickBi = <T,>(isRTL: boolean, ar: T, en: T): T =>
  (isRTL ? ar : en);

export function useBi() {
  const { isRTL } = useLanguage();
  return React.useCallback(
    <T,>(ar: T, en: T): T => (isRTL ? ar : en),
    [isRTL],
  );
}

type BiProps = {
  ar: string;
  en: string;
  as?: keyof JSX.IntrinsicElements;
  className?: string;
};

export const Bi: React.FC<BiProps> = ({ ar, en, as: Tag = 'span', className }) => {
  const { isRTL } = useLanguage();
  return <Tag className={className}>{isRTL ? ar : en}</Tag>;
};

export default Bi;