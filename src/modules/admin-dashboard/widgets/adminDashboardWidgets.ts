/**
 * ADMIN-REDESIGN PHASE 4 — Admin Dashboard Widget Registry.
 *
 * Centralized declaration of every widget rendered on the admin home
 * (`/admin`). The renderer in `AdminDashboardView` reads `order` from
 * this registry plus the user's saved layout (show/hide overrides) to
 * decide what to render and in what order — no widget is hard-coded
 * inside the page anymore.
 *
 * Foundation-only: ordering is consumed but reorder UI is intentionally
 * deferred to a later phase. show/hide + reset is wired now.
 */
import {
  Activity,
  AlertCircle,
  BarChart3,
  Building2,
  Crown,
  FileText,
  Mail,
  MessageSquare,
  Newspaper,
  PieChart as PieChartIcon,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
  Zap,
  type LucideIcon,
} from 'lucide-react';

export type AdminWidgetGroup =
  | 'overview'
  | 'operations'
  | 'users-entities'
  | 'finance'
  | 'system-health'
  | 'activity';

export type AdminWidgetSize = 'sm' | 'md' | 'lg' | 'full';

export type AdminWidgetPermission = 'admin' | 'super_admin';

export interface AdminWidgetDefinition {
  /** Stable id used as a render key and in the saved layout. */
  id: string;
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionEn: string;
  group: AdminWidgetGroup;
  /** Default order (lower = earlier). The renderer respects user overrides. */
  order: number;
  /** Layout hint consumed by the renderer's grid. */
  size: AdminWidgetSize;
  /** Required permission to render. */
  permission: AdminWidgetPermission;
  /** Whether the widget is shown by default in a fresh install. */
  defaultVisible: boolean;
  /** When false, user CANNOT hide the widget (e.g. the welcome hero). */
  hideable: boolean;
  icon: LucideIcon;
}

export interface AdminQuickAction {
  id: string;
  labelAr: string;
  labelEn: string;
  /** MUST exist in `ADMIN_NAV_ITEMS` (enforced by tests). */
  route: string;
  icon: LucideIcon;
}

export const ADMIN_DASHBOARD_WIDGETS: readonly AdminWidgetDefinition[] = [
  {
    id: 'welcome-hero',
    titleAr: 'الترحيب', titleEn: 'Welcome',
    descriptionAr: 'بطاقة الترحيب وأزرار التحديث.',
    descriptionEn: 'Greeting hero with refresh controls.',
    group: 'overview', order: 0, size: 'full',
    permission: 'admin', defaultVisible: true, hideable: false, icon: Sparkles,
  },
  {
    id: 'alerts-row',
    titleAr: 'التنبيهات اليومية', titleEn: 'Daily Alerts',
    descriptionAr: 'متأخرات، ملخص اليوم، وحالة العضوية.',
    descriptionEn: 'Overdue, today summary, membership.',
    group: 'overview', order: 10, size: 'full',
    permission: 'admin', defaultVisible: true, hideable: true, icon: AlertCircle,
  },
  {
    id: 'todays-pulse',
    titleAr: 'نبض اليوم', titleEn: "Today's Pulse",
    descriptionAr: 'مقاييس اليوم الحية.',
    descriptionEn: 'Live operational counters for today.',
    group: 'operations', order: 20, size: 'full',
    permission: 'admin', defaultVisible: true, hideable: true, icon: Zap,
  },
  {
    id: 'needs-attention',
    titleAr: 'بحاجة إلى إجراء', titleEn: 'Needs Attention',
    descriptionAr: 'الموافقات والطلبات بانتظار المسؤول.',
    descriptionEn: 'Approvals and items awaiting an admin.',
    group: 'operations', order: 30, size: 'full',
    permission: 'admin', defaultVisible: true, hideable: true, icon: AlertCircle,
  },
  {
    id: 'kpi-bento',
    titleAr: 'مؤشرات الأداء', titleEn: 'KPI Cards',
    descriptionAr: 'مؤشرات النظام الأساسية.',
    descriptionEn: 'Headline KPIs across the platform.',
    group: 'overview', order: 40, size: 'full',
    permission: 'admin', defaultVisible: true, hideable: true, icon: BarChart3,
  },
  {
    id: 'quick-actions',
    titleAr: 'إجراءات سريعة', titleEn: 'Quick Actions',
    descriptionAr: 'اختصارات للوصول السريع.',
    descriptionEn: 'Shortcuts to common admin destinations.',
    group: 'overview', order: 45, size: 'full',
    permission: 'admin', defaultVisible: true, hideable: true, icon: Sparkles,
  },
  {
    id: 'monthly-contracts-chart',
    titleAr: 'العقود الشهرية', titleEn: 'Monthly Contracts',
    descriptionAr: 'مخطط للعقود حسب الشهر.',
    descriptionEn: 'Bar chart of contracts per month.',
    group: 'finance', order: 50, size: 'md',
    permission: 'admin', defaultVisible: true, hideable: true, icon: BarChart3,
  },
  {
    id: 'contract-status-chart',
    titleAr: 'توزيع حالة العقود', titleEn: 'Contract Status',
    descriptionAr: 'مخطط دائري لحالات العقود.',
    descriptionEn: 'Pie chart of contract statuses.',
    group: 'finance', order: 60, size: 'md',
    permission: 'admin', defaultVisible: true, hideable: true, icon: PieChartIcon,
  },
  {
    id: 'user-growth-chart',
    titleAr: 'نمو المستخدمين', titleEn: 'User Growth',
    descriptionAr: 'مخطط مساحي لنمو المستخدمين.',
    descriptionEn: 'Area chart of user growth.',
    group: 'users-entities', order: 70, size: 'md',
    permission: 'admin', defaultVisible: true, hideable: true, icon: TrendingUp,
  },
  {
    id: 'recent-activity',
    titleAr: 'آخر النشاطات', titleEn: 'Recent Activity',
    descriptionAr: 'سجل أحدث الإجراءات الإدارية.',
    descriptionEn: 'Latest admin actions.',
    group: 'activity', order: 80, size: 'md',
    permission: 'admin', defaultVisible: true, hideable: true, icon: Activity,
  },
  {
    id: 'recent-users',
    titleAr: 'أحدث المستخدمين', titleEn: 'Recent Users',
    descriptionAr: 'آخر المستخدمين المسجّلين.',
    descriptionEn: 'Most recently registered users.',
    group: 'users-entities', order: 90, size: 'md',
    permission: 'admin', defaultVisible: true, hideable: true, icon: Users,
  },
  {
    id: 'service-ops',
    titleAr: 'تشغيل الخدمات', titleEn: 'Service Operations',
    descriptionAr: 'حالة تفعيلات الخدمات.',
    descriptionEn: 'Service-activation counters.',
    group: 'operations', order: 100, size: 'full',
    permission: 'admin', defaultVisible: true, hideable: true, icon: ShieldCheck,
  },
  {
    id: 'system-summary',
    titleAr: 'ملخص النظام', titleEn: 'System Summary',
    descriptionAr: 'مقاييس عامة للنظام.',
    descriptionEn: 'General system counters.',
    group: 'system-health', order: 110, size: 'full',
    permission: 'admin', defaultVisible: true, hideable: true, icon: ShieldAlert,
  },
];

/**
 * Quick-action shortcuts shown by the `quick-actions` widget. Every
 * route MUST exist in `ADMIN_NAV_ITEMS` — enforced by tests.
 */
export const ADMIN_DASHBOARD_QUICK_ACTIONS: readonly AdminQuickAction[] = [
  { id: 'qa-users',         labelAr: 'المستخدمين',       labelEn: 'Users',               route: '/admin/users',                  icon: Users },
  { id: 'qa-businesses',    labelAr: 'المنشآت',          labelEn: 'Businesses',          route: '/admin/businesses',             icon: Building2 },
  { id: 'qa-provider-rev',  labelAr: 'مراجعة المزودين',  labelEn: 'Provider Review',     route: '/admin/provider-review',        icon: ShieldCheck },
  { id: 'qa-approvals',     labelAr: 'الاعتمادات',       labelEn: 'Approvals',           route: '/admin/approvals',              icon: ShieldCheck },
  { id: 'qa-memberships',   labelAr: 'العضويات',         labelEn: 'Memberships',         route: '/admin/memberships',            icon: Crown },
  { id: 'qa-identity',      labelAr: 'إدارة الهوية',     labelEn: 'Identity Hub',        route: '/admin/identity',               icon: Users },
  { id: 'qa-messages',      labelAr: 'رسائل التواصل',    labelEn: 'Contact Messages',    route: '/admin/contact-messages',       icon: Mail },
  { id: 'qa-conversations', labelAr: 'المحادثات',        labelEn: 'Conversations',       route: '/dashboard/messages',           icon: MessageSquare },
  { id: 'qa-svc-activ',     labelAr: 'تفعيل الخدمات',   labelEn: 'Service Activations', route: '/admin/service-activations',    icon: ShieldCheck },
  { id: 'qa-activity',      labelAr: 'سجل النشاط',       labelEn: 'Activity Log',        route: '/admin/activity-log',           icon: Activity },
  { id: 'qa-system',        labelAr: 'إعدادات النظام',  labelEn: 'System Settings',     route: '/admin/system-settings',        icon: ShieldAlert },
  { id: 'qa-search',        labelAr: 'تدقيق الموقع',    labelEn: 'Site Audit',          route: '/admin/site-audit',             icon: Search },
  { id: 'qa-blog',          labelAr: 'المدونة',          labelEn: 'Blog',                route: '/dashboard/blog',               icon: Newspaper },
  { id: 'qa-taxonomy',      labelAr: 'الشجرة التصنيفية', labelEn: 'Taxonomy',            route: '/admin/taxonomy',               icon: BarChart3 },
  { id: 'qa-leads',         labelAr: 'طلبات العملاء',    labelEn: 'Lead Requests',       route: '/admin/lead-requests',          icon: MessageSquare },
  { id: 'qa-contracts',     labelAr: 'العقود',           labelEn: 'Contracts',           route: '/admin/contracts',              icon: FileText },
];

export const ADMIN_DASHBOARD_DEFAULT_ORDER: readonly string[] =
  [...ADMIN_DASHBOARD_WIDGETS]
    .sort((a, b) => a.order - b.order)
    .map((w) => w.id);

export function getAdminWidget(id: string): AdminWidgetDefinition | undefined {
  return ADMIN_DASHBOARD_WIDGETS.find((w) => w.id === id);
}