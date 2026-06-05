/**
 * OPERATIONS-CENTER-UNIFICATION-1 — Unified work-queue normalization.
 *
 * Pure module. No Supabase imports. No DB writes. No new scoring engines —
 * upstream callers pass already-scored data from existing service wrappers
 * (providerGrowthQueries, catalogGovernanceQueries, …) and we just project
 * a uniform shape for the unified operations view.
 */

export type UnifiedSourceSystem =
  | 'provider_growth'
  | 'catalog_governance'
  | 'data_enrichment'
  | 'brand_requests'
  | 'provider_review'
  | 'quote_operations'
  | 'procurement'
  | 'contracts'
  | 'work_orders'
  | 'customer_experience'
  | 'warranty'
  | 'memberships'
  | 'system_access'
  | 'google_integrations'
  | 'observability';

export type UnifiedSlaStatus = 'ok' | 'warning' | 'overdue';
export type UnifiedPriority = 'critical' | 'high' | 'medium' | 'low';

export interface UnifiedWorkItem {
  ref: string;
  type: string;
  title_ar: string;
  title_en: string;
  source_system: UnifiedSourceSystem;
  status: string;
  priority: UnifiedPriority;
  sla_status: UnifiedSlaStatus;
  target_route: string;
  action_label_ar: string;
  action_label_en: string;
  age_hours: number;
  safe_metadata: Record<string, string | number | null>;
}

/** Compute age in whole hours from an ISO timestamp (or null → 0). */
export function computeAgeHours(iso: string | null | undefined, now: Date = new Date()): number {
  if (!iso) return 0;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return 0;
  return Math.max(0, Math.floor((now.getTime() - t) / 3_600_000));
}

/** Deterministic SLA bands — dashboard-only, no cron, no writes. */
export function computeSlaStatus(ageHours: number): UnifiedSlaStatus {
  if (ageHours > 72) return 'overdue';
  if (ageHours >= 24) return 'warning';
  return 'ok';
}

/** Deterministic priority bands derived from SLA + an optional severity hint. */
export function computePriority(
  sla: UnifiedSlaStatus,
  severityHint?: 'low' | 'medium' | 'high',
): UnifiedPriority {
  if (sla === 'overdue' && severityHint === 'high') return 'critical';
  if (sla === 'overdue') return 'high';
  if (sla === 'warning') return 'medium';
  return 'low';
}

/** Allow-list of safe metadata keys (no PII, no UUIDs). */
const SAFE_KEYS = new Set([
  'business_ref', 'service_ref', 'stage', 'status', 'source',
  'readiness_score', 'quality_score', 'age_hours', 'count',
]);

export function projectSafeMetadata(
  input: Record<string, unknown>,
): Record<string, string | number | null> {
  const out: Record<string, string | number | null> = {};
  for (const [k, v] of Object.entries(input)) {
    if (!SAFE_KEYS.has(k)) continue;
    if (v === null || v === undefined) { out[k] = null; continue; }
    if (typeof v === 'number') {
      out[k] = Math.max(0, Math.min(100, Math.round(v)));
    } else if (typeof v === 'string') {
      out[k] = v.slice(0, 64);
    }
  }
  return out;
}

/** Aggregate KPIs over a normalized queue — pure. */
export interface UnifiedKpis {
  total: number;
  overdue: number;
  warning: number;
  ok: number;
  bySystem: Record<UnifiedSourceSystem, number>;
  byPriority: Record<UnifiedPriority, number>;
}

export function computeUnifiedKpis(items: UnifiedWorkItem[]): UnifiedKpis {
  const bySystem = {} as Record<UnifiedSourceSystem, number>;
  const byPriority: Record<UnifiedPriority, number> = {
    critical: 0, high: 0, medium: 0, low: 0,
  };
  let overdue = 0, warning = 0, ok = 0;
  for (const it of items) {
    bySystem[it.source_system] = (bySystem[it.source_system] ?? 0) + 1;
    byPriority[it.priority] += 1;
    if (it.sla_status === 'overdue') overdue += 1;
    else if (it.sla_status === 'warning') warning += 1;
    else ok += 1;
  }
  return { total: items.length, overdue, warning, ok, bySystem, byPriority };
}

/** Catalogue of source-system → target-route + label, for the cards grid. */
export interface SourceSystemRoute {
  system: UnifiedSourceSystem;
  label_ar: string;
  label_en: string;
  route: string;
  queue_route?: string;
}

export const SOURCE_SYSTEM_ROUTES: ReadonlyArray<SourceSystemRoute> = [
  { system: 'provider_growth', label_ar: 'نمو المزودين', label_en: 'Provider Growth', route: '/admin/provider-growth', queue_route: '/admin/provider-growth/queue' },
  { system: 'catalog_governance', label_ar: 'حوكمة الكتالوج', label_en: 'Catalog Governance', route: '/admin/catalog-governance', queue_route: '/admin/catalog-governance/queue' },
  { system: 'data_enrichment', label_ar: 'إثراء البيانات', label_en: 'Data Enrichment', route: '/admin/data-enrichment' },
  { system: 'brand_requests', label_ar: 'طلبات العلامات', label_en: 'Brand Requests', route: '/admin/brand-requests' },
  { system: 'provider_review', label_ar: 'مراجعة المزودين', label_en: 'Provider Review', route: '/admin/approvals' },
  { system: 'quote_operations', label_ar: 'عمليات العروض', label_en: 'Quote Operations', route: '/admin/quote-operations' },
  { system: 'procurement', label_ar: 'المشتريات', label_en: 'Procurement', route: '/dashboard/procurement' },
  { system: 'contracts', label_ar: 'العقود', label_en: 'Contracts', route: '/admin/contracts' },
  { system: 'work_orders', label_ar: 'أوامر العمل', label_en: 'Work Orders', route: '/dashboard/work-orders' },
  { system: 'customer_experience', label_ar: 'تجربة العميل', label_en: 'Customer Experience', route: '/dashboard/customer-experience' },
  { system: 'warranty', label_ar: 'الضمانات', label_en: 'Warranty', route: '/dashboard/warranties' },
  { system: 'memberships', label_ar: 'العضويات', label_en: 'Memberships', route: '/admin/memberships' },
  { system: 'system_access', label_ar: 'صلاحيات النظام', label_en: 'System Access', route: '/admin/system-access' },
  { system: 'google_integrations', label_ar: 'تكاملات Google', label_en: 'Google Integrations', route: '/admin/integrations/google' },
  { system: 'observability', label_ar: 'الرصد التشغيلي', label_en: 'Observability', route: '/admin/operations' },
];