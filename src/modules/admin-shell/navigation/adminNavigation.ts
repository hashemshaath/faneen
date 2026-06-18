/**
 * ADMIN-REDESIGN PHASE 3 — Central admin navigation registry.
 *
 * Single source of truth for the admin sidebar, the Cmd/Ctrl+K command
 * palette, breadcrumbs and admin-shell tests. Every admin destination
 * MUST be declared here; sidebar/palette code maps over this registry
 * rather than maintaining its own arrays.
 *
 * Constraints (Phase 3 acceptance):
 *  - exactly 7 canonical groups
 *  - each item has a unique route
 *  - every route resolves to a <Route> registered in src/App.tsx
 *  - `permission: 'super_admin'` items are hidden from non-super admins
 *  - `hiddenInSidebar: true` items stay reachable from the palette and
 *    direct URLs but do not render in the sidebar tree
 */
import type { ElementType } from 'react';
import {
  LayoutDashboard,
  Activity,
  Inbox,
  FileText,
  CheckCircle2,
  MessageSquare,
  Users,
  Building2,
  ShieldCheck,
  ShieldAlert,
  Shield,
  Crown,
  CreditCard,
  Wrench,
  Layers,
  Tag,
  FolderTree,
  Megaphone,
  Image as ImageIcon,
  BookOpen,
  HelpCircle,
  MapPin,
  Package,
  Truck,
  QrCode,
  Sliders,
  Plug,
  Bot,
  KeyRound,
  FileBarChart,
  BarChart3,
  TrendingUp,
  FlaskConical,
  Database,
  Mail,
  Globe,
  Search,
  ClipboardList,
  Gauge,
  Sparkles,
  Receipt,
  Award,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';

export type AdminNavPermission = 'admin' | 'super_admin';

export interface AdminNavBadge {
  ar: string;
  en: string;
  tone?: 'new' | 'support' | 'neutral';
}

export interface AdminNavItem {
  id: string;
  labelAr: string;
  labelEn: string;
  route: string;
  icon: ElementType;
  permission?: AdminNavPermission;
  badge?: AdminNavBadge;
  /** Free-form bilingual search keywords for the command palette. */
  keywords?: readonly string[];
  /** Item is reachable via URL/palette but hidden from the sidebar tree. */
  hiddenInSidebar?: boolean;
  /** Optional pin-to-favorites lock-out. */
  isPinnedAllowed?: boolean;
  /** Marks a route that exists only to redirect a legacy URL. */
  legacyRedirectOf?: string;
}

export type AdminNavGroupId =
  | 'overview'
  | 'operations'
  | 'users-entities'
  | 'content-directory'
  | 'system-governance'
  | 'analytics'
  | 'finance';

export interface AdminNavGroup {
  id: AdminNavGroupId;
  labelAr: string;
  labelEn: string;
  icon: ElementType;
  descriptionAr?: string;
  descriptionEn?: string;
  items: readonly AdminNavItem[];
}

export const ADMIN_NAV_GROUPS: readonly AdminNavGroup[] = [
  {
    id: 'overview',
    labelAr: 'نظرة عامة',
    labelEn: 'Overview',
    icon: LayoutDashboard,
    descriptionAr: 'لوحة الإدارة، المؤشرات، ومركز العمليات',
    descriptionEn: 'Admin home, KPIs, and the operations center',
    items: [
      { id: 'admin-home', labelAr: 'الرئيسية', labelEn: 'Admin Home', route: '/admin', icon: LayoutDashboard, keywords: ['dashboard', 'لوحة'] },
      { id: 'kpis', labelAr: 'المؤشرات', labelEn: 'KPIs', route: '/admin/kpis', icon: Gauge, keywords: ['metrics', 'مؤشرات'], hiddenInSidebar: true },
      { id: 'operations-center', labelAr: 'مركز العمليات', labelEn: 'Operations Center', route: '/admin/operations', icon: Activity, keywords: ['operations', 'عمليات'] },
      { id: 'activity-log', labelAr: 'سجل النشاط', labelEn: 'Activity Log', route: '/admin/activity-log', icon: ClipboardList, keywords: ['log', 'سجل'], hiddenInSidebar: true },
      { id: 'ref-triage', labelAr: 'فرز المراجع', labelEn: 'Bulk Reference Triage', route: '/admin/ref/triage', icon: Sparkles, badge: { ar: 'دعم', en: 'Support', tone: 'support' }, keywords: ['triage', 'ref', 'مراجع'], hiddenInSidebar: true },
    ],
  },
  {
    id: 'operations',
    labelAr: 'العمليات',
    labelEn: 'Operations',
    icon: Activity,
    descriptionAr: 'الطلبات والعقود والاعتمادات ومراجعة المزودين',
    descriptionEn: 'Requests, contracts, approvals and provider review',
    items: [
      { id: 'procurement-center', labelAr: 'المشتريات', labelEn: 'Procurement', route: '/admin/procurement', icon: FileText, keywords: ['procurement', 'quotes', 'leads', 'مشتريات'] },
      { id: 'contracts', labelAr: 'العقود', labelEn: 'Contracts', route: '/admin/contracts', icon: FileText, keywords: ['contracts', 'عقود'] },
      { id: 'quote-operations', labelAr: 'مركز عروض الأسعار', labelEn: 'Quote Operations', route: '/admin/quote-operations', icon: FileText, hiddenInSidebar: true },
      { id: 'quote-requests', labelAr: 'طلبات عروض الأسعار', labelEn: 'Quote Requests', route: '/admin/quote-requests', icon: Inbox, hiddenInSidebar: true },
      { id: 'lead-requests', labelAr: 'طلبات العملاء', labelEn: 'Lead Requests', route: '/admin/lead-requests', icon: Inbox, hiddenInSidebar: true },
      { id: 'service-requests', labelAr: 'طلبات الخدمات', labelEn: 'Service Requests', route: '/admin/service-requests', icon: Wrench, hiddenInSidebar: true },
      { id: 'service-activations', labelAr: 'تفعيل الخدمات', labelEn: 'Service Activations', route: '/admin/service-activations', icon: CheckCircle2, hiddenInSidebar: true },
      { id: 'approvals', labelAr: 'الاعتمادات', labelEn: 'Approvals', route: '/admin/approvals', icon: CheckCircle2, hiddenInSidebar: true },
      { id: 'contact-messages', labelAr: 'رسائل التواصل', labelEn: 'Contact Messages', route: '/admin/contact-messages', icon: MessageSquare, hiddenInSidebar: true },
      { id: 'provider-review', labelAr: 'مراجعة المزودين', labelEn: 'Provider Review', route: '/admin/provider-review', icon: ShieldCheck, hiddenInSidebar: true },
      { id: 'provider-leads', labelAr: 'فرص المزودين', labelEn: 'Provider Leads', route: '/admin/provider-leads', icon: Inbox, hiddenInSidebar: true },
      { id: 'ownership-transfer', labelAr: 'نقل الملكية', labelEn: 'Ownership Transfers', route: '/admin/ownership-transfer-requests', icon: RefreshCw, hiddenInSidebar: true },
    ],
  },
  {
    id: 'users-entities',
    labelAr: 'المستخدمون والكيانات',
    labelEn: 'Users & Entities',
    icon: Users,
    descriptionAr: 'مركز الهوية، المنشآت، الوصول والموافقات',
    descriptionEn: 'Identity center, businesses, access and approvals',
    items: [
      { id: 'businesses', labelAr: 'المنشآت', labelEn: 'Businesses', route: '/admin/businesses', icon: Building2, keywords: ['businesses', 'providers', 'منشآت'] },
      { id: 'identity-hub', labelAr: 'المستخدمون والوصول', labelEn: 'Users & Access', route: '/admin/identity', icon: Users, keywords: ['users', 'identity', 'access'] },
      { id: 'users', labelAr: 'المستخدمون', labelEn: 'Users', route: '/admin/users', icon: Users, hiddenInSidebar: true },
      { id: 'business-visibility', labelAr: 'ظهور المنشآت', labelEn: 'Business Visibility', route: '/admin/business-visibility', icon: ShieldCheck, hiddenInSidebar: true },
      { id: 'entity-access-requests', labelAr: 'طلبات الوصول', labelEn: 'Entity Access Requests', route: '/admin/entity-access-requests', icon: KeyRound, hiddenInSidebar: true },
      { id: 'access-management', labelAr: 'إدارة الوصول', labelEn: 'Access Management', route: '/admin/access-management', icon: KeyRound, hiddenInSidebar: true },
      { id: 'system-access', labelAr: 'وصول النظام', labelEn: 'System Access', route: '/admin/system-access', icon: Shield, hiddenInSidebar: true },
      { id: 'membership-rejections', labelAr: 'رفض العضويات', labelEn: 'Membership Rejections', route: '/admin/membership-rejections', icon: AlertTriangle, hiddenInSidebar: true },
      { id: 'brand-requests', labelAr: 'طلبات العلامات', labelEn: 'Brand Requests', route: '/admin/brand-requests', icon: Award, hiddenInSidebar: true },
    ],
  },
  {
    id: 'content-directory',
    labelAr: 'المحتوى والدليل',
    labelEn: 'Content & Directory',
    icon: FolderTree,
    descriptionAr: 'التصنيفات، العلامات، القطاعات والمحتوى',
    descriptionEn: 'Taxonomy, brands, sectors and content',
    items: [
      { id: 'content-center', labelAr: 'المحتوى والدليل', labelEn: 'Content', route: '/admin/content', icon: FolderTree, keywords: ['content', 'directory', 'taxonomy', 'brands', 'محتوى'] },
      { id: 'taxonomy', labelAr: 'الشجرة التصنيفية', labelEn: 'Taxonomy', route: '/admin/taxonomy', icon: FolderTree, hiddenInSidebar: true },
      { id: 'project-categories', labelAr: 'تصنيفات المشاريع', labelEn: 'Project Categories', route: '/admin/project-categories', icon: FolderTree, keywords: ['projects', 'categories', 'تصنيفات', 'مشاريع'] },
      { id: 'categories', labelAr: 'الفئات', labelEn: 'Categories', route: '/admin/categories', icon: Layers, hiddenInSidebar: true },
      { id: 'tags', labelAr: 'الوسوم', labelEn: 'Tags', route: '/admin/tags', icon: Tag, hiddenInSidebar: true },
      { id: 'brands', labelAr: 'العلامات التجارية', labelEn: 'Brands', route: '/admin/brands', icon: Award, hiddenInSidebar: true },
      { id: 'private-sectors', labelAr: 'القطاعات الخاصة', labelEn: 'Private Sectors', route: '/admin/private-sectors', icon: Layers, hiddenInSidebar: true },
      { id: 'home-sectors', labelAr: 'قطاعات الواجهة', labelEn: 'Home Sectors', route: '/admin/home-sectors', icon: Layers, hiddenInSidebar: true },
      { id: 'home-faq', labelAr: 'أسئلة الواجهة', labelEn: 'Home FAQ', route: '/admin/home-faq', icon: HelpCircle, hiddenInSidebar: true },
      { id: 'help', labelAr: 'مركز المساعدة', labelEn: 'Help Center', route: '/admin/help', icon: HelpCircle, hiddenInSidebar: true },
      { id: 'partner-showcase', labelAr: 'معرض الشركاء', labelEn: 'Partner Showcase', route: '/admin/partner-showcase', icon: ImageIcon, hiddenInSidebar: true },
      { id: 'showcase', labelAr: 'المعرض', labelEn: 'Showcase', route: '/admin/showcase', icon: ImageIcon, hiddenInSidebar: true },
      { id: 'sector-seo', labelAr: 'SEO القطاعات', labelEn: 'Sector SEO', route: '/admin/sector-seo', icon: Search, hiddenInSidebar: true },
      { id: 'client-sites', labelAr: 'مواقع العملاء', labelEn: 'Client Sites', route: '/admin/client-sites', icon: Globe, hiddenInSidebar: true },
      { id: 'locations', labelAr: 'المواقع الجغرافية', labelEn: 'Locations', route: '/admin/locations', icon: MapPin, hiddenInSidebar: true },
      { id: 'catalog-governance', labelAr: 'حوكمة الكتالوج', labelEn: 'Catalog Governance', route: '/admin/catalog-governance', icon: ShieldCheck, hiddenInSidebar: true },
      { id: 'assets', labelAr: 'الأصول الرقمية', labelEn: 'Assets', route: '/admin/assets', icon: Package, hiddenInSidebar: true },
      { id: 'rentals', labelAr: 'مركز التأجير', labelEn: 'Rentals', route: '/admin/rentals', icon: Truck, hiddenInSidebar: true },
      { id: 'barcodes', labelAr: 'سجل الباركود', labelEn: 'Barcode Registry', route: '/admin/barcode-registry', icon: QrCode, hiddenInSidebar: true },
      { id: 'contract-templates', labelAr: 'قوالب العقود', labelEn: 'Contract Templates', route: '/admin/contract-templates', icon: FileText, hiddenInSidebar: true },
    ],
  },
  {
    id: 'system-governance',
    labelAr: 'النظام والحوكمة',
    labelEn: 'System & Governance',
    icon: ShieldAlert,
    descriptionAr: 'الهوية والإعدادات والتكاملات والتدقيق',
    descriptionEn: 'Identity, settings, integrations and audit',
    items: [
      { id: 'settings-center', labelAr: 'الإعدادات', labelEn: 'Settings', route: '/admin/settings', icon: Sliders, keywords: ['settings', 'system', 'integrations', 'إعدادات'] },
      { id: 'identity-center', labelAr: 'مركز الهوية', labelEn: 'Identity Center', route: '/admin/system/identity', icon: Sparkles, permission: 'super_admin', keywords: ['identity', 'tokens', 'هوية'] },
      { id: 'system-settings', labelAr: 'إعدادات النظام', labelEn: 'System Settings', route: '/admin/system-settings', icon: Sliders, hiddenInSidebar: true },
      { id: 'branding', labelAr: 'الهوية البصرية', labelEn: 'Branding', route: '/admin/branding', icon: Sparkles, hiddenInSidebar: true },
      { id: 'integrations', labelAr: 'التكاملات', labelEn: 'Integrations', route: '/admin/integrations', icon: Plug, hiddenInSidebar: true },
      { id: 'integrations-google', labelAr: 'تكامل Google', labelEn: 'Google Integration', route: '/admin/integrations/google', icon: Plug, hiddenInSidebar: true },
      { id: 'audit-log', labelAr: 'سجل التدقيق', labelEn: 'Audit Log', route: '/admin/audit-log', icon: ClipboardList, hiddenInSidebar: true },
      { id: 'diagnostics', labelAr: 'التشخيص', labelEn: 'Diagnostics', route: '/admin/diagnostics', icon: AlertTriangle, hiddenInSidebar: true },
      { id: 'cron-runs', labelAr: 'تشغيل المهام', labelEn: 'Cron Runs', route: '/admin/cron-runs', icon: RefreshCw, hiddenInSidebar: true },
      { id: 'ai-center', labelAr: 'مركز الذكاء', labelEn: 'AI Center', route: '/admin/ai-center', icon: Bot, hiddenInSidebar: true },
      { id: 'api-settings', labelAr: 'إعدادات الـ API', labelEn: 'API Settings', route: '/admin/api-settings', icon: KeyRound, hiddenInSidebar: true },
      { id: 'api-docs', labelAr: 'وثائق الـ API', labelEn: 'API Docs', route: '/admin/api-docs', icon: BookOpen, hiddenInSidebar: true },
      { id: 'email-center', labelAr: 'مركز البريد', labelEn: 'Email Center', route: '/admin/email-center', icon: Mail, hiddenInSidebar: true },
      { id: 'email-deliverability', labelAr: 'تتبع البريد', labelEn: 'Email Deliverability', route: '/admin/email-deliverability', icon: Mail, hiddenInSidebar: true },
      { id: 'analytics-settings', labelAr: 'إعدادات التحليلات', labelEn: 'Analytics Settings', route: '/admin/analytics-settings', icon: Sliders, hiddenInSidebar: true },
      { id: 'data-enrichment-governance', labelAr: 'حوكمة البيانات', labelEn: 'Data Governance', route: '/admin/data-enrichment-governance', icon: Database, hiddenInSidebar: true },
      { id: 'sitemap-status', labelAr: 'حالة Sitemap', labelEn: 'Sitemap Status', route: '/admin/sitemap-status', icon: Search, hiddenInSidebar: true },
      { id: 'site-audit', labelAr: 'تدقيق الموقع', labelEn: 'Site Audit', route: '/admin/site-audit', icon: ShieldCheck, hiddenInSidebar: true },
      { id: 'performance', labelAr: 'الأداء', labelEn: 'Performance', route: '/admin/performance', icon: Gauge, hiddenInSidebar: true },
    ],
  },
  {
    id: 'analytics',
    labelAr: 'التحليلات',
    labelEn: 'Analytics',
    icon: BarChart3,
    descriptionAr: 'تحليلات المزودين والسوق وتقارير الأداء',
    descriptionEn: 'Provider, market and operations analytics',
    items: [
      { id: 'provider-analytics', labelAr: 'تحليلات المزودين', labelEn: 'Provider Analytics', route: '/admin/provider-analytics', icon: BarChart3, hiddenInSidebar: true },
      { id: 'provider-growth', labelAr: 'نمو المزودين', labelEn: 'Provider Growth', route: '/admin/provider-growth', icon: TrendingUp, hiddenInSidebar: true },
      { id: 'market-analytics', labelAr: 'تحليلات السوق', labelEn: 'Market Analytics', route: '/admin/market-analytics', icon: BarChart3, hiddenInSidebar: true },
      { id: 'membership-events', labelAr: 'أحداث العضويات', labelEn: 'Membership Events', route: '/admin/membership-events', icon: Activity, hiddenInSidebar: true },
      { id: 'conversion-optimization', labelAr: 'تحسين التحويلات', labelEn: 'Conversion Optimization', route: '/admin/conversion-optimization', icon: TrendingUp, hiddenInSidebar: true },
      { id: 'reports', labelAr: 'التقارير', labelEn: 'Reports', route: '/admin/reports', icon: FileBarChart, hiddenInSidebar: true },
      { id: 'ab-experiments', labelAr: 'تجارب A/B', labelEn: 'A/B Experiments', route: '/admin/ab-experiments', icon: FlaskConical, hiddenInSidebar: true },
      { id: 'data-enrichment', labelAr: 'إثراء البيانات', labelEn: 'Data Enrichment', route: '/admin/data-enrichment', icon: Database, hiddenInSidebar: true },
    ],
  },
  {
    id: 'finance',
    labelAr: 'المالية',
    labelEn: 'Finance',
    icon: CreditCard,
    descriptionAr: 'العضويات والمدفوعات والاشتراكات',
    descriptionEn: 'Memberships, payments and subscriptions',
    items: [
      { id: 'finance-center', labelAr: 'المالية', labelEn: 'Finance', route: '/admin/finance', icon: CreditCard, keywords: ['finance', 'memberships', 'payments', 'مالية'] },
      { id: 'memberships', labelAr: 'مركز العضويات', labelEn: 'Memberships Center', route: '/admin/memberships', icon: Crown, hiddenInSidebar: true },
      { id: 'membership-payments', labelAr: 'مدفوعات العضويات', labelEn: 'Membership Payments', route: '/admin/membership-payments', icon: CreditCard, hiddenInSidebar: true },
      { id: 'provider-subscriptions', labelAr: 'اشتراكات المزودين', labelEn: 'Provider Subscriptions', route: '/admin/provider-subscriptions', icon: Crown, hiddenInSidebar: true },
      { id: 'pdf-exports', labelAr: 'تصدير PDF', labelEn: 'PDF Exports', route: '/admin/pdf-exports', icon: Receipt, hiddenInSidebar: true },
    ],
  },
];

/**
 * Flat list of every admin nav item — useful for the command palette and
 * for invariants that need to assert uniqueness across the registry.
 */
export const ADMIN_NAV_ITEMS: readonly AdminNavItem[] = ADMIN_NAV_GROUPS.flatMap((g) => g.items);

export function findAdminNavItem(route: string): AdminNavItem | undefined {
  return ADMIN_NAV_ITEMS.find((it) => it.route === route);
}

/**
 * Filter a list of nav groups by the current admin's privilege level.
 * Items flagged `permission: 'super_admin'` are removed when the caller
 * is not a super admin. Groups left without any items are dropped.
 */
export function filterByPermission(
  groups: readonly AdminNavGroup[],
  ctx: { isSuperAdmin: boolean },
): AdminNavGroup[] {
  const out: AdminNavGroup[] = [];
  for (const g of groups) {
    const items = g.items.filter((it) => {
      if (it.permission === 'super_admin' && !ctx.isSuperAdmin) return false;
      return true;
    });
    if (items.length > 0) out.push({ ...g, items });
  }
  return out;
}

export default ADMIN_NAV_GROUPS;