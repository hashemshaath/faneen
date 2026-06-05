/**
 * PROVIDER-GROWTH-ENGINE-2 — Service wrappers for the admin growth UI.
 *
 * All Supabase access happens here. Pages must import from `@/modules/providers`
 * (or this file's named exports), never from `@/integrations/supabase/client`.
 */
import { supabase } from '@/integrations/supabase/client';
import { listAdminBusinesses } from '@/modules/businesses';
import {
  computeProviderReadinessScore,
  type ReadinessInput,
  type ReadinessResult,
} from '@/modules/providers/providerReadinessScore';
import {
  computeProviderQualityScore,
  type QualityInput,
  type QualityResult,
} from '@/modules/providers/providerQualityScore';
import { PROVIDER_GROWTH_EVENTS, type ProviderGrowthEvent } from '@/modules/providers/growthEvents';

export type GrowthStage =
  | 'discovered' | 'imported' | 'enriched' | 'review_pending'
  | 'verified' | 'published' | 'rejected' | 'archived';

export const GROWTH_STAGES: ReadonlyArray<GrowthStage> = [
  'discovered', 'imported', 'enriched', 'review_pending',
  'verified', 'published', 'rejected', 'archived',
];

export interface GrowthPipelineRow {
  id: string;
  business_id: string | null;
  lead_id: string | null;
  stage: GrowthStage;
  source: string | null;
  source_ref: string | null;
  assigned_to: string | null;
  readiness_score: number | null;
  quality_score: number | null;
  updated_at: string;
}

export interface GrowthBusinessRow {
  id: string;
  ref_id: string | null;
  name_ar: string | null;
  name_en: string | null;
  username: string | null;
  logo_url: string | null;
  cover_url: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  city: string | null;
  city_id: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  is_active: boolean;
  is_verified: boolean;
  approval_status: string | null;
  updated_at: string | null;
  category_id: string | null;
  // derived counts (best-effort; 0 when not surfaced by the base read)
  sectors: string[];
  sub_services: string[];
  brands_count: number;
  gallery_count: number;
}

export interface ProviderGrowthInsight {
  business: GrowthBusinessRow;
  readiness: ReadinessResult;
  quality: QualityResult;
  stage: GrowthStage | null;
  source: string | null;
}

function toReadinessInput(b: GrowthBusinessRow): ReadinessInput {
  return {
    name_ar: b.name_ar, name_en: b.name_en,
    username: b.username, username_status: b.username ? 'approved' : null,
    phone: b.phone, email: b.email, website: b.website,
    city: b.city, city_id: b.city_id, address: b.address,
    latitude: b.latitude, longitude: b.longitude,
    logo_url: b.logo_url, banner_url: b.cover_url, cover_url: b.cover_url,
    gallery_count: b.gallery_count, sectors: b.sectors, sub_services: b.sub_services,
    brands_count: b.brands_count, is_verified: b.is_verified,
    approval_status: b.approval_status,
    seo_title: b.name_en ?? b.name_ar, seo_description: null, slug: b.username,
  };
}

function toQualityInput(b: GrowthBusinessRow): QualityInput {
  return {
    name_ar: b.name_ar, name_en: b.name_en,
    phone: b.phone, email: b.email, website: b.website, logo_url: b.logo_url,
    city: b.city, city_id: b.city_id, address: b.address,
    latitude: b.latitude, longitude: b.longitude,
    sectors: b.sectors, sub_services: b.sub_services,
    updated_at: b.updated_at,
  };
}

export async function loadProviderGrowthBusinesses(opts: { limit?: number } = {}): Promise<{
  rows: GrowthBusinessRow[];
  error: Error | null;
}> {
  const { data, error } = await listAdminBusinesses<Record<string, unknown>>({
    select:
      'id, ref_id, name_ar, name_en, username, logo_url, cover_url, phone, email, website, city_id, address, latitude, longitude, is_active, is_verified, approval_status, updated_at, category_id, website',
    orderBy: { column: 'updated_at', ascending: false },
    limit: opts.limit ?? 500,
  });
  if (error) return { rows: [], error: error as Error };

  const rows: GrowthBusinessRow[] = (data ?? []).map((r) => {
    const id = r.id as string;
    const categoryId = (r.category_id as string | null) ?? null;
    return {
      id,
      ref_id: (r.ref_id as string | null) ?? null,
      name_ar: (r.name_ar as string | null) ?? null,
      name_en: (r.name_en as string | null) ?? null,
      username: (r.username as string | null) ?? null,
      logo_url: (r.logo_url as string | null) ?? null,
      cover_url: (r.cover_url as string | null) ?? null,
      phone: (r.phone as string | null) ?? null,
      email: (r.email as string | null) ?? null,
      website: (r.website as string | null) ?? null,
      city: null,
      city_id: (r.city_id as string | null) ?? null,
      address: (r.address as string | null) ?? null,
      latitude: (r.latitude as number | null) ?? null,
      longitude: (r.longitude as number | null) ?? null,
      is_active: r.is_active !== false,
      is_verified: r.is_verified === true,
      approval_status: (r.approval_status as string | null) ?? null,
      updated_at: (r.updated_at as string | null) ?? null,
      category_id: categoryId,
      sectors: categoryId ? [categoryId] : [],
      sub_services: [],
      brands_count: 0,
      gallery_count: 0,
    };
  });
  return { rows, error: null };
}

export async function loadProviderGrowthPipeline(): Promise<{
  rows: GrowthPipelineRow[];
  byStage: Record<GrowthStage, number>;
  error: Error | null;
}> {
  const byStage: Record<GrowthStage, number> = {
    discovered: 0, imported: 0, enriched: 0, review_pending: 0,
    verified: 0, published: 0, rejected: 0, archived: 0,
  };
  const { data, error } = await supabase
    .from('provider_growth_pipeline')
    .select('id, business_id, lead_id, stage, source, source_ref, assigned_to, readiness_score, quality_score, updated_at')
    .order('updated_at', { ascending: false })
    .limit(500);
  if (error) return { rows: [], byStage, error: error as Error };
  const rows = (data ?? []) as GrowthPipelineRow[];
  for (const r of rows) byStage[r.stage] = (byStage[r.stage] ?? 0) + 1;
  return { rows, byStage, error: null };
}

export function buildProviderInsight(
  b: GrowthBusinessRow,
  pipeline?: GrowthPipelineRow | null,
): ProviderGrowthInsight {
  return {
    business: b,
    readiness: computeProviderReadinessScore(toReadinessInput(b)),
    quality: computeProviderQualityScore(toQualityInput(b)),
    stage: pipeline?.stage ?? null,
    source: pipeline?.source ?? null,
  };
}

export interface GrowthDirectoryKPIs {
  totalProviders: number;
  publishedProviders: number;
  verifiedProviders: number;
  readyToPublish: number;
  withWebsite: number;
  withImages: number;
  withServices: number;
  withBrands: number;
  withFullAddress: number;
  averageReadiness: number;
  averageQuality: number;
}

export function computeGrowthKPIs(rows: GrowthBusinessRow[]): GrowthDirectoryKPIs {
  const insights = rows.map((b) => buildProviderInsight(b));
  const n = rows.length || 1;
  const sum = (xs: number[]) => xs.reduce((s, v) => s + v, 0);
  return {
    totalProviders: rows.length,
    publishedProviders: rows.filter((b) => b.approval_status === 'published').length,
    verifiedProviders: rows.filter((b) => b.is_verified).length,
    readyToPublish: insights.filter((i) => i.readiness.band === 'ready').length,
    withWebsite: rows.filter((b) => !!b.website).length,
    withImages: rows.filter((b) => !!b.logo_url || b.gallery_count > 0).length,
    withServices: rows.filter((b) => b.sectors.length > 0).length,
    withBrands: rows.filter((b) => b.brands_count > 0).length,
    withFullAddress: rows.filter((b) => !!b.address && typeof b.latitude === 'number' && typeof b.longitude === 'number').length,
    averageReadiness: Math.round(sum(insights.map((i) => i.readiness.score)) / n),
    averageQuality: Math.round(sum(insights.map((i) => i.quality.score)) / n),
  };
}

export type GrowthQueueFilter =
  | 'all'
  | 'missing_logo'
  | 'missing_services'
  | 'missing_brands'
  | 'missing_address'
  | 'low_quality'
  | 'low_readiness'
  | 'pending_verification'
  | 'pending_enrichment';

export const GROWTH_QUEUE_FILTERS: ReadonlyArray<GrowthQueueFilter> = [
  'all', 'missing_logo', 'missing_services', 'missing_brands', 'missing_address',
  'low_quality', 'low_readiness', 'pending_verification', 'pending_enrichment',
];

export function filterGrowthInsights(
  insights: ProviderGrowthInsight[],
  filter: GrowthQueueFilter,
): ProviderGrowthInsight[] {
  switch (filter) {
    case 'missing_logo':         return insights.filter((i) => !i.business.logo_url);
    case 'missing_services':     return insights.filter((i) => i.business.sectors.length === 0);
    case 'missing_brands':       return insights.filter((i) => i.business.brands_count === 0);
    case 'missing_address':      return insights.filter((i) => !i.business.address || typeof i.business.latitude !== 'number');
    case 'low_quality':          return insights.filter((i) => i.quality.score < 80);
    case 'low_readiness':        return insights.filter((i) => i.readiness.score < 60);
    case 'pending_verification': return insights.filter((i) => !i.business.is_verified || i.stage === 'review_pending');
    case 'pending_enrichment':   return insights.filter((i) => i.stage === 'imported' || i.stage === 'discovered');
    case 'all':
    default:                     return insights;
  }
}

/** Re-exported so admin pages do not import event constants from elsewhere. */
export { PROVIDER_GROWTH_EVENTS };
export type { ProviderGrowthEvent };