/**
 * OPERATIONS-CENTER-UNIFICATION-1 — read-only aggregator.
 *
 * Composes existing service wrappers — never reads tables directly here
 * and never duplicates business logic. The only allowed behaviour is:
 * read → normalize → compute age → compute priority → compute SLA →
 * aggregate KPIs. No writes. No new publish actions.
 */

import {
  loadProviderGrowthBusinesses,
  buildProviderInsight,
  type ProviderGrowthInsight,
} from '@/modules/providers/services/providerGrowthQueries';
import {
  loadCatalogServices,
  loadServiceBrandCounts,
  buildServiceInsight,
  countDuplicateNames,
  type CatalogServiceInsight,
} from '@/modules/catalog/services/catalogGovernanceQueries';
import {
  computeAgeHours,
  computeSlaStatus,
  computePriority,
  projectSafeMetadata,
  computeUnifiedKpis,
  SOURCE_SYSTEM_ROUTES,
  type UnifiedWorkItem,
  type UnifiedKpis,
} from '@/modules/operations/unifiedWorkQueue';

function providerToWorkItem(i: ProviderGrowthInsight, now: Date): UnifiedWorkItem {
  const ageHours = computeAgeHours(i.business.updated_at, now);
  const sla = computeSlaStatus(ageHours);
  const severityHint =
    i.readiness.score < 50 || i.quality.score < 50 ? 'high' :
    i.readiness.score < 75 ? 'medium' : 'low';
  return {
    ref: i.business.ref_id,
    type: 'provider',
    title_ar: i.business.name_ar ?? i.business.username ?? i.business.ref_id,
    title_en: i.business.name_en ?? i.business.username ?? i.business.ref_id,
    source_system: 'provider_growth',
    status: i.business.approval_status ?? 'draft',
    priority: computePriority(sla, severityHint),
    sla_status: sla,
    target_route: '/admin/provider-growth/queue',
    action_label_ar: 'فتح في نمو المزودين',
    action_label_en: 'Open in Provider Growth',
    age_hours: ageHours,
    safe_metadata: projectSafeMetadata({
      business_ref: i.business.ref_id,
      stage: i.stage,
      source: i.source,
      readiness_score: i.readiness.score,
      quality_score: i.quality.score,
    }),
  };
}

function serviceToWorkItem(i: CatalogServiceInsight, now: Date): UnifiedWorkItem {
  const ageHours = computeAgeHours(i.row.updated_at, now);
  const sla = computeSlaStatus(ageHours);
  const severityHint =
    i.readiness.score < 50 || i.quality.score < 50 ? 'high' :
    i.readiness.score < 75 ? 'medium' : 'low';
  return {
    ref: i.row.id,
    type: 'catalog_service',
    title_ar: i.row.name_ar ?? i.row.name_en ?? i.row.id,
    title_en: i.row.name_en ?? i.row.name_ar ?? i.row.id,
    source_system: 'catalog_governance',
    status: i.stage,
    priority: computePriority(sla, severityHint),
    sla_status: sla,
    target_route: '/admin/catalog-governance/queue',
    action_label_ar: 'فتح في حوكمة الكتالوج',
    action_label_en: 'Open in Catalog Governance',
    age_hours: ageHours,
    safe_metadata: projectSafeMetadata({
      service_ref: i.row.id,
      stage: i.stage,
      readiness_score: i.readiness.score,
      quality_score: i.quality.score,
    }),
  };
}

export interface UnifiedOperationsSnapshot {
  items: UnifiedWorkItem[];
  kpis: UnifiedKpis;
  sources: typeof SOURCE_SYSTEM_ROUTES;
}

export async function loadUnifiedOperationsSnapshot(
  opts: { providerLimit?: number; serviceLimit?: number; now?: Date } = {},
): Promise<UnifiedOperationsSnapshot> {
  const now = opts.now ?? new Date();
  const [provRes, svcRes] = await Promise.all([
    loadProviderGrowthBusinesses({ limit: opts.providerLimit ?? 200 }),
    loadCatalogServices({ limit: opts.serviceLimit ?? 200 }),
  ]);
  const providerInsights = (provRes.rows ?? []).map((r) => buildProviderInsight(r));
  const svcRows = svcRes.rows ?? [];
  const brandCounts = svcRows.length
    ? (await loadServiceBrandCounts(svcRows.map((r) => r.id))).counts
    : new Map<string, number>();
  const dupes = countDuplicateNames(svcRows);
  const serviceInsights = svcRows.map((r) =>
    buildServiceInsight(r, brandCounts.get(r.id) ?? 0, dupes.get(r.id) ?? 0),
  );

  const items: UnifiedWorkItem[] = [
    ...providerInsights.map((i) => providerToWorkItem(i, now)),
    ...serviceInsights.map((i) => serviceToWorkItem(i, now)),
  ];
  const kpis = computeUnifiedKpis(items);
  return { items, kpis, sources: SOURCE_SYSTEM_ROUTES };
}