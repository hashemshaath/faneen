import React, { useMemo } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { usePageMeta, useMultiJsonLd } from '@/hooks/usePageMeta';
import { buildBreadcrumbList, ogImageFor } from '@/lib/seo/structured-data';
import { ProviderLeadFormPage } from './providerJoin/rebuild/ProviderLeadFormPage';

/**
 * Public route shell for `/join/qitaat` (alias `/providers/join`).
 * The actual 4-step wizard lives in `./providerJoin/rebuild/ProviderLeadFormPage`.
 * This file only owns SEO meta + JSON-LD; it intentionally contains no
 * Supabase calls and no form logic.
 */
const ProviderJoin: React.FC = () => {
  const { isRTL, language } = useLanguage();
  const t = (ar: string, en: string) => (isRTL ? ar : en);

  usePageMeta({
    title: t('انضم إلى قِطاعات | تسجيل المنشآت', 'Join Qitaat | Provider Registration'),
    description: t(
      'سجّل منشأتك في قِطاعات — المنصة الصناعية الأولى للألمنيوم والزجاج والخشب والحديد.',
      'Register your business on Qitaat — the leading industrial directory for Aluminum, Glass, Wood, and Steel providers.',
    ),
    canonical: 'https://qitaat.com/join/qitaat',
    ogTitle: t('انضم إلى قِطاعات', 'Join Qitaat'),
    ogDescription: t('قدّم طلب الانضمام إلى منصة قِطاعات.', 'Submit your join request to Qitaat.'),
    ogImage: ogImageFor('contact'),
  });

  useMultiJsonLd(useMemo(() => {
    const crumbs = buildBreadcrumbList([
      { name: language === 'ar' ? 'انضم إلى قطاعات' : 'Join Qitaat', url: '/join/qitaat' },
    ]);
    return crumbs ? [crumbs] : null;
  }, [language]));

  return <ProviderLeadFormPage />;
};

export default ProviderJoin;