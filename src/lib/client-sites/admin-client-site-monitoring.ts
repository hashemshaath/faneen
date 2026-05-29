/**
 * Pure helpers, constants and types for the /admin/client-sites monitoring
 * page. NO Supabase / RPC calls live here — only presentation-safe utilities
 * shared by the page and its extracted sub-components.
 */
import React from 'react';
import {
  Activity, Briefcase, Building2, FileText, HardHat, Home, Layers, MapPin,
  Store, Warehouse,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/* Types                                                              */
/* ------------------------------------------------------------------ */

export interface MonitoringRow {
  id: string;
  site_ref: string;
  site_name: string | null;
  label: string;
  site_type: string;
  city_name: string | null;
  visibility: string;
  qr_enabled: boolean;
  qr_revoked_at: string | null;
  archived_at: string | null;
  scan_count: number;
  last_scanned_at: string | null;
  created_at: string;
  updated_at: string;
  business_id: string | null;
  business_name_ar: string | null;
  business_name_en: string | null;
  access_requests_count: number;
  pending_requests_count: number;
  approved_access_count: number;
  provider_interests_count: number;
  contracts_count: number;
  latest_activity_at: string;
}

export interface MonitoringList {
  total: number;
  limit: number;
  offset: number;
  rows: MonitoringRow[];
}

export interface MonitoringSummary {
  total_sites: number;
  active_sites: number;
  archived_sites: number;
  qr_enabled_sites: number;
  qr_revoked_sites: number;
  qr_disabled_sites: number;
  shared_by_qr_sites: number;
  public_limited_sites: number;
  total_scans: number;
  sites_with_access_requests: number;
  pending_access_requests: number;
  approved_access_grants: number;
  rejected_access_grants: number;
  revoked_access_grants: number;
  provider_interests: number;
  sites_linked_to_contracts: number;
  total_contracts_with_site: number;
  visits_last_7d: number;
}

export interface SiteDetailSite {
  id: string;
  site_ref: string;
  site_name: string | null;
  label: string;
  site_type: string;
  city_name: string | null;
  district: string | null;
  visibility: string;
  qr_enabled: boolean;
  qr_revoked: boolean;
  qr_revoked_at: string | null;
  scan_count: number;
  last_scanned_at: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
  business_id: string | null;
  business_name_ar: string | null;
  business_name_en: string | null;
}

export interface SiteDetail {
  site: SiteDetailSite | null;
  recent_visits: Array<{
    created_at: string;
    visit_source: string;
    action: string;
    attempted_section: string | null;
    provider_business_id: string | null;
    provider_name_ar: string | null;
    provider_name_en: string | null;
  }>;
  recent_grants: Array<{
    id: string;
    status: string;
    access_level: string;
    requested_at: string;
    approved_at: string | null;
    rejected_at: string | null;
    revoked_at: string | null;
    ignored_at: string | null;
    reason: string | null;
    provider_business_id: string;
    provider_name_ar: string | null;
    provider_name_en: string | null;
  }>;
  recent_interests: Array<{
    id: string;
    lead_ref_id: string | null;
    subject: string | null;
    status: string;
    created_at: string;
    initiated_by: string | null;
    converted: boolean;
    business_id: string | null;
    provider_name_ar: string | null;
    provider_name_en: string | null;
  }>;
  related_contracts: {
    total: number;
    active: number;
    last_created_at: string | null;
  };
}

export type SortKey =
  | 'activity_desc' | 'activity_asc'
  | 'scans_desc' | 'scans_asc'
  | 'pending_desc' | 'contracts_desc' | 'interests_desc'
  | 'created_desc' | 'created_asc';

export type StatusFilter = 'active' | 'archived' | 'all';
export type Density = 'comfortable' | 'compact';

export interface PersistedFilters {
  status: StatusFilter;
  visibility: string;
  qrStatus: string;
  siteType: string;
  search: string;
  city: string;
  sortBy: SortKey;
  density: Density;
  autoRefresh: boolean;
  pageSize: number;
}

/* ------------------------------------------------------------------ */
/* Constants                                                          */
/* ------------------------------------------------------------------ */

export const FILTERS_STORAGE_KEY = 'qitaat_admin_client_sites_filters_v1';

export const DEFAULT_FILTERS: PersistedFilters = {
  status: 'active',
  visibility: 'all',
  qrStatus: 'all',
  siteType: 'all',
  search: '',
  city: '',
  sortBy: 'activity_desc',
  density: 'comfortable',
  autoRefresh: false,
  pageSize: 25,
};

export const SITE_TYPES: ReadonlyArray<string> = [
  'apartment', 'villa', 'showroom', 'office', 'branch',
  'warehouse', 'project', 'commercial', 'other',
];

export const SORT_OPTIONS: ReadonlyArray<{ key: SortKey; ar: string; en: string }> = [
  { key: 'activity_desc', ar: 'الأحدث نشاطاً', en: 'Latest activity' },
  { key: 'activity_asc',  ar: 'الأقدم نشاطاً', en: 'Oldest activity' },
  { key: 'scans_desc',    ar: 'الأكثر مسحاً',  en: 'Most scans' },
  { key: 'scans_asc',     ar: 'الأقل مسحاً',   en: 'Least scans' },
  { key: 'pending_desc',  ar: 'طلبات معلّقة',  en: 'Pending requests' },
  { key: 'contracts_desc',ar: 'الأكثر عقوداً', en: 'Most contracts' },
  { key: 'interests_desc',ar: 'الأكثر اهتماماً', en: 'Most interests' },
  { key: 'created_desc',  ar: 'الأحدث إنشاءً', en: 'Newest created' },
  { key: 'created_asc',   ar: 'الأقدم إنشاءً', en: 'Oldest created' },
];

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

/** Localized date/time, RTL-aware, with safe fallback. */
export function formatDate(iso: string | null | undefined, isRTL: boolean): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString(isRTL ? 'ar-SA-u-nu-latn' : 'en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export type QrStatus = 'enabled' | 'revoked' | 'disabled';

export function getQrStatus(
  row: { qr_enabled: boolean; qr_revoked_at: string | null },
): QrStatus {
  if (row.qr_revoked_at) return 'revoked';
  if (row.qr_enabled) return 'enabled';
  return 'disabled';
}

const SITE_TYPE_ICON_MAP: Record<string, React.ReactNode> = {
  apartment: React.createElement(Home, { className: 'h-4 w-4' }),
  villa: React.createElement(Home, { className: 'h-4 w-4' }),
  showroom: React.createElement(Store, { className: 'h-4 w-4' }),
  office: React.createElement(Briefcase, { className: 'h-4 w-4' }),
  branch: React.createElement(Building2, { className: 'h-4 w-4' }),
  warehouse: React.createElement(Warehouse, { className: 'h-4 w-4' }),
  project: React.createElement(HardHat, { className: 'h-4 w-4' }),
  commercial: React.createElement(Building2, { className: 'h-4 w-4' }),
  other: React.createElement(Layers, { className: 'h-4 w-4' }),
};

export function iconForSiteType(t: string): React.ReactNode {
  return SITE_TYPE_ICON_MAP[t] ?? React.createElement(MapPin, { className: 'h-4 w-4' });
}

// Re-exports kept for any future use without importing lucide twice
export { Activity, FileText };

/** In-memory sort over the already-fetched page of rows. */
export function sortRows(rows: MonitoringRow[], sortBy: SortKey): MonitoringRow[] {
  const arr = [...rows];
  const ts = (v: string | null | undefined) => (v ? new Date(v).getTime() : 0);
  switch (sortBy) {
    case 'activity_asc':  arr.sort((a, b) => ts(a.latest_activity_at) - ts(b.latest_activity_at)); break;
    case 'activity_desc': arr.sort((a, b) => ts(b.latest_activity_at) - ts(a.latest_activity_at)); break;
    case 'scans_desc':    arr.sort((a, b) => b.scan_count - a.scan_count); break;
    case 'scans_asc':     arr.sort((a, b) => a.scan_count - b.scan_count); break;
    case 'pending_desc':  arr.sort((a, b) => b.pending_requests_count - a.pending_requests_count); break;
    case 'contracts_desc':arr.sort((a, b) => b.contracts_count - a.contracts_count); break;
    case 'interests_desc':arr.sort((a, b) => b.provider_interests_count - a.provider_interests_count); break;
    case 'created_desc':  arr.sort((a, b) => ts(b.created_at) - ts(a.created_at)); break;
    case 'created_asc':   arr.sort((a, b) => ts(a.created_at) - ts(b.created_at)); break;
  }
  return arr;
}

/** Build a UTF-8 BOM CSV from the current visible rows. */
export function buildMonitoringCsv(rows: MonitoringRow[]): string {
  const header = [
    'site_ref', 'site_name', 'site_type', 'city', 'visibility', 'qr_status',
    'scans', 'pending_requests', 'interests', 'contracts', 'latest_activity',
  ];
  const lines = rows.map(r => [
    r.site_ref,
    (r.site_name || r.label || '').replace(/[",\n]/g, ' '),
    r.site_type,
    r.city_name || '',
    r.visibility,
    getQrStatus(r),
    r.scan_count,
    r.pending_requests_count,
    r.provider_interests_count,
    r.contracts_count,
    r.latest_activity_at,
  ].join(','));
  return '\uFEFF' + [header.join(','), ...lines].join('\n');
}

export function loadPersistedFilters(): PersistedFilters {
  try {
    const raw = localStorage.getItem(FILTERS_STORAGE_KEY);
    if (raw) return { ...DEFAULT_FILTERS, ...(JSON.parse(raw) as Partial<PersistedFilters>) };
  } catch { /* noop */ }
  return DEFAULT_FILTERS;
}

export function savePersistedFilters(p: PersistedFilters): void {
  try { localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(p)); } catch { /* noop */ }
}