/**
 * PSG-1 — Service wrapper for the Catalog Governance admin UI.
 * All Supabase access happens here. Pages must NOT import the client.
 */
import { supabase } from '@/integrations/supabase/client';
import { loadBrandCountsByServiceIds } from '@/modules/brands/services/brandsService';
import {
  computeServiceReadinessScore,
  type ServiceReadinessResult,
} from '@/modules/catalog/serviceReadinessScore';
import {
  computeServiceQualityScore,
  type ServiceQualityResult,
} from '@/modules/catalog/serviceQualityScore';
import {
  mapServiceToLifecycleStage,
  type CatalogLifecycleStage,
  CATALOG_LIFECYCLE_STAGES,
} from '@/modules/catalog/governanceEvents';

export interface CatalogServiceRow {
  id: string;
  business_id: string;
  name_ar: string | null;
  name_en: string | null;
  description_ar: string | null;
  description_en: string | null;
  category_id: string | null;
  admin_status: string | null;
  provider_status: string | null;
  is_active: boolean | null;
  is_demo: boolean | null;
  price_from: number | null;
  price_to: number | null;
  updated_at: string | null;
}

export interface CatalogServiceInsight {
  row: CatalogServiceRow;
  stage: CatalogLifecycleStage;
  readiness: ServiceReadinessResult;
  quality: ServiceQualityResult;
  duplicateNameCount: number;
  brandCount: number;
  hasBrand: boolean;
  hasCategory: boolean;
}

const SERVICE_SELECT =
  'id, business_id, name_ar, name_en, description_ar, description_en, ' +
  'category_id, admin_status, provider_status, is_active, is_demo, ' +
  'price_from, price_to, updated_at';

export async function loadCatalogServices(opts: { limit?: number } = {}) {
  const limit = Math.min(2000, Math.max(50, opts.limit ?? 500));
  const { data, error } = await supabase
    .from('business_services')
    .select(SERVICE_SELECT)
    .eq('is_demo', false)
    .order('updated_at', { ascending: false })
    .limit(limit);
  return { rows: (data ?? []) as unknown as CatalogServiceRow[], error };
}

/**
 * PSG-1 canonical entry-point for fetching brand link counts per service.
 * Delegates to the brands module helper which owns all direct access to
 * the `business_service_brands` relation table (enforced by
 * `brands-isolation-audit`). Callers in catalog governance must use this
 * wrapper — never query `business_service_brands` directly.
 */
export async function loadServiceBrandCounts(serviceIds: string[]) {
  return loadBrandCountsByServiceIds(serviceIds);
}

/** Pure: count name duplicates across the loaded set. */
export function countDuplicateNames(rows: CatalogServiceRow[]): Map<string, number> {
  const m = new Map<string, number>();
  const tally = new Map<string, number>();
  for (const r of rows) {
    const key = (r.name_ar ?? r.name_en ?? '').trim().toLowerCase();
    if (!key) continue;
    tally.set(key, (tally.get(key) ?? 0) + 1);
  }
  for (const r of rows) {
    const key = (r.name_ar ?? r.name_en ?? '').trim().toLowerCase();
    if (!key) { m.set(r.id, 0); continue; }
    m.set(r.id, Math.max(0, (tally.get(key) ?? 1) - 1));
  }
  return m;
}

export function buildServiceInsight(
  row: CatalogServiceRow,
  brandCount: number,
  duplicateNameCount: number,
): CatalogServiceInsight {
  const readiness = computeServiceReadinessScore({
    name_ar: row.name_ar,
    name_en: row.name_en,
    description_ar: row.description_ar,
    description_en: row.description_en,
    category_id: row.category_id,
    service_area_count: 0,
    images_count: 0,
    seo_title: row.name_en ?? row.name_ar,
    seo_description: row.description_en ?? row.description_ar,
    slug: null,
    admin_status: row.admin_status,
    provider_status: row.provider_status,
    is_active: row.is_active,
    price_from: row.price_from,
    price_to: row.price_to,
  });
  const quality = computeServiceQualityScore({
    name_ar: row.name_ar,
    name_en: row.name_en,
    description_ar: row.description_ar,
    description_en: row.description_en,
    duplicate_name_count: duplicateNameCount,
    category_id: row.category_id,
    category_depth: row.category_id ? 1 : 0,
    category_active: row.category_id ? true : false,
    service_area_count: 0,
    images_count: 0,
    seo_title: row.name_en ?? row.name_ar,
    seo_description: row.description_en ?? row.description_ar,
    slug: null,
  });
  return {
    row,
    stage: mapServiceToLifecycleStage(row),
    readiness,
    quality,
    duplicateNameCount,
    brandCount,
    hasBrand: brandCount > 0,
    hasCategory: !!row.category_id,
  };
}

export interface CatalogGovernanceKPIs {
  total: number;
  byStage: Record<CatalogLifecycleStage, number>;
  readyToPublish: number;
  lowQuality: number;
  lowReadiness: number;
  missingBrand: number;
  missingCategory: number;
  seoIssues: number;
}

export function computeCatalogKPIs(insights: CatalogServiceInsight[]): CatalogGovernanceKPIs {
  const byStage = Object.fromEntries(
    CATALOG_LIFECYCLE_STAGES.map((s) => [s, 0]),
  ) as Record<CatalogLifecycleStage, number>;
  let readyToPublish = 0;
  let lowQuality = 0;
  let lowReadiness = 0;
  let missingBrand = 0;
  let missingCategory = 0;
  let seoIssues = 0;
  for (const i of insights) {
    byStage[i.stage] = (byStage[i.stage] ?? 0) + 1;
    if (i.readiness.score >= 85 && i.stage !== 'published') readyToPublish += 1;
    if (i.quality.score < 65) lowQuality += 1;
    if (i.readiness.score < 65) lowReadiness += 1;
    if (!i.hasBrand) missingBrand += 1;
    if (!i.hasCategory) missingCategory += 1;
    const seo = i.readiness.components.find((c) => c.key === 'seo');
    if (!seo || seo.ratio < 0.6) seoIssues += 1;
  }
  return { total: insights.length, byStage, readyToPublish, lowQuality, lowReadiness, missingBrand, missingCategory, seoIssues };
}

export const CATALOG_QUEUE_FILTERS = [
  'draft',
  'review',
  'approved',
  'published',
  'archived',
  'missing_brand',
  'missing_category',
  'low_readiness',
  'low_quality',
  'seo_issues',
] as const;

export type CatalogQueueFilter = (typeof CATALOG_QUEUE_FILTERS)[number];

export function filterCatalogInsights(
  insights: CatalogServiceInsight[],
  filter: CatalogQueueFilter,
): CatalogServiceInsight[] {
  switch (filter) {
    case 'draft':
    case 'review':
    case 'approved':
    case 'published':
    case 'archived':
      return insights.filter((i) => i.stage === filter);
    case 'missing_brand':
      return insights.filter((i) => !i.hasBrand);
    case 'missing_category':
      return insights.filter((i) => !i.hasCategory);
    case 'low_readiness':
      return insights.filter((i) => i.readiness.score < 65);
    case 'low_quality':
      return insights.filter((i) => i.quality.score < 65);
    case 'seo_issues':
      return insights.filter((i) => {
        const c = i.readiness.components.find((x) => x.key === 'seo');
        return !c || c.ratio < 0.6;
      });
  }
}