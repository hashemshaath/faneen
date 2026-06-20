/**
 * ADMIN BUSINESSES + PROVIDERS CONTROL CENTER — Phase 1.
 *
 * Single source of truth for the control-center tabs. Phase 1 ships
 * `overview` + `businesses` with real content; the remaining tabs are
 * declared here so the navigation is complete, but their content
 * renders a "coming next" empty state (no fake data).
 */
import {
  BarChart3, Building2, Briefcase, Layers, ShieldCheck, Rocket,
  type LucideIcon,
} from 'lucide-react';

export type BusinessAdminTabId =
  | 'overview'
  | 'businesses'
  | 'providers'
  | 'taxonomies'
  | 'review'
  | 'pilot';

export interface BusinessAdminTabSpec {
  id: BusinessAdminTabId;
  icon: LucideIcon;
  labelAr: string;
  labelEn: string;
  /** True once the tab renders real content (no coming-soon state). */
  ready: boolean;
}

export const BUSINESS_ADMIN_TABS: ReadonlyArray<BusinessAdminTabSpec> = [
  { id: 'overview',   icon: BarChart3,   labelAr: 'نظرة عامة',           labelEn: 'Overview',           ready: true },
  { id: 'businesses', icon: Building2,   labelAr: 'الجهات',              labelEn: 'Businesses',         ready: true },
  { id: 'providers',  icon: Briefcase,   labelAr: 'مزودو الخدمة',        labelEn: 'Service Providers',  ready: true },
  { id: 'taxonomies', icon: Layers,      labelAr: 'التصنيفات والقطاعات', labelEn: 'Taxonomies & Sectors', ready: true },
  { id: 'review',     icon: ShieldCheck, labelAr: 'المراجعة والظهور',    labelEn: 'Review & Visibility', ready: true },
  { id: 'pilot',      icon: Rocket,      labelAr: 'جاهزية التشغيل',      labelEn: 'Pilot Readiness',    ready: true },
] as const;

export const DEFAULT_BUSINESS_ADMIN_TAB: BusinessAdminTabId = 'overview';
