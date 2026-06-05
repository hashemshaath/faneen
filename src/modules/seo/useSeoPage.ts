/**
 * Thin React hook wrapper around `usePageMeta` + `useMultiJsonLd` that
 * routes everything through the unified `seoTitleBuilder`.
 *
 * Phase 2 of SEO-TITLES-METADATA-OPTIMIZER-1 migrates public pages from
 * direct `usePageMeta` calls to this hook so titles, descriptions, OG,
 * JSON-LD names, and language all stay consistent.
 */
import { useMemo } from 'react';
import { usePageMeta, useMultiJsonLd } from '@/hooks/usePageMeta';
import { buildSeo, type SeoInputs } from './seoTitleBuilder';

export interface UseSeoPageOptions extends SeoInputs {
  canonical?: string;
  ogImage?: string;
  ogType?: string;
  noindex?: boolean;
  /** Optional JSON-LD blocks; consumers build them with builder output. */
  jsonLd?: Record<string, unknown>[] | null;
}

export function useSeoPage(options: UseSeoPageOptions) {
  const {
    kind, lang, name, activity, city, category, brand, service,
    customTitle, customDescription, rawDescription, keywords,
    canonical, ogImage, ogType, noindex, jsonLd,
  } = options;
  const keywordsKey = keywords?.join('|');
  const built = useMemo(
    () => buildSeo({
      kind, lang, name, activity, city, category, brand, service,
      customTitle, customDescription, rawDescription, keywords,
    }),
    // keywordsKey stands in for the keywords array identity
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [kind, lang, name, activity, city, category, brand, service,
     customTitle, customDescription, rawDescription, keywordsKey],
  );

  usePageMeta({
    title: built.title,
    description: built.description,
    keywords: built.keywords,
    canonical,
    ogImage,
    ogType,
    noindex,
    ogTitle: built.title,
    ogDescription: built.description,
  });

  useMultiJsonLd(jsonLd ?? null);

  return built;
}