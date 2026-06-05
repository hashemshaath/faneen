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
  const built = useMemo(() => buildSeo(options), [
    options.kind,
    options.lang,
    options.name,
    options.activity,
    options.city,
    options.category,
    options.brand,
    options.service,
    options.customTitle,
    options.customDescription,
    options.rawDescription,
    options.keywords?.join('|'),
  ]);

  usePageMeta({
    title: built.title,
    description: built.description,
    keywords: built.keywords,
    canonical: options.canonical,
    ogImage: options.ogImage,
    ogType: options.ogType,
    noindex: options.noindex,
    ogTitle: built.title,
    ogDescription: built.description,
  });

  useMultiJsonLd(options.jsonLd ?? null);

  return built;
}