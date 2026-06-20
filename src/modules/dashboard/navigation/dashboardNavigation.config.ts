/**
 * Dashboard navigation config — the single source of menu items for
 * the User and Provider audiences. The Admin audience derives its
 * groups dynamically from `@/modules/admin-shell` (registry-driven).
 *
 * Hard rules:
 *  - No hardcoded Arabic strings for any concept that already exists
 *    in `UNIFIED_ITEM_LABELS` / `UNIFIED_GROUP_LABELS`.
 *  - One concept → one route. No duplicate routes inside the same
 *    audience.
 *  - The «Create business» CTA always resolves to `CREATE_ENTITY_ROUTE`
 *    (/register-entity). `/onboarding` is for completing an EXISTING
 *    entity only.
 */
import {
  LayoutDashboard, Wrench, Image, Star, FileText, Shield, Settings,
  CreditCard, Megaphone, FolderOpen, Layers, MessageSquare, Users,
  Building2, Bell, Activity, Crown, BarChart3, MapPin, User,
  ClipboardList, Sparkles, Award, Truck, Package, Inbox, Settings2,
  CalendarClock, ShieldCheck, Mail,
} from 'lucide-react';
import { ADMIN_NAV_GROUPS } from '@/modules/admin-shell';
import {
  UNIFIED_GROUP_LABELS,
  UNIFIED_ITEM_LABELS,
} from './dashboardNavigation.labels';
import type { DashboardNavGroup } from './dashboardNavigation.types';

// ─── PROVIDER ──────────────────────────────────────────────────────
export const providerNavGroups: DashboardNavGroup[] = [
  {
    key: 'dashboard',
    groupLabel: UNIFIED_GROUP_LABELS.dashboard,
    icon: LayoutDashboard,
    items: [
      { label: UNIFIED_ITEM_LABELS.overview, url: '/dashboard', icon: LayoutDashboard, end: true },
      { label: { ar: 'التحليلات', en: 'Analytics' }, url: '/dashboard/analytics', icon: BarChart3 },
      { label: { ar: 'سجل العمليات', en: 'Operations Feed' }, url: '/dashboard/operations/feed', icon: Activity, badge: { ar: 'جديد', en: 'New', tone: 'new' } },
    ],
  },
  {
    key: 'business',
    groupLabel: UNIFIED_GROUP_LABELS.business,
    icon: Wrench,
    items: [
      { label: UNIFIED_ITEM_LABELS.businessProfile, url: '/dashboard/business-edit', icon: Building2 },
      { label: UNIFIED_ITEM_LABELS.services, url: '/dashboard/services', icon: Wrench },
      { label: { ar: 'العلامات التجارية', en: 'Brands' }, url: '/dashboard/brands', icon: Award },
      { label: UNIFIED_ITEM_LABELS.portfolio, url: '/dashboard/portfolio', icon: Image },
      { label: UNIFIED_ITEM_LABELS.projects, url: '/dashboard/projects', icon: FolderOpen },
      { label: UNIFIED_ITEM_LABELS.branches, url: '/dashboard/branches', icon: Building2 },
      { label: { ar: 'العروض', en: 'Promotions' }, url: '/dashboard/promotions', icon: Megaphone },
      { label: { ar: 'مناطق الخدمة', en: 'Service Areas' }, url: '/dashboard/provider/service-areas', icon: MapPin },
      { label: UNIFIED_ITEM_LABELS.sites, url: '/dashboard/sites', icon: MapPin },
      { label: { ar: 'القطاعات الخاصة', en: 'Private Sectors' }, url: '/dashboard/private-sectors', icon: Layers },
      { label: { ar: 'التقييمات', en: 'Reviews' }, url: '/dashboard/reviews', icon: Star },
      { label: UNIFIED_ITEM_LABELS.visibility, url: '/dashboard/badge', icon: ShieldCheck },
    ],
  },
  {
    key: 'providerOps',
    groupLabel: UNIFIED_GROUP_LABELS.providerOps,
    icon: Inbox,
    items: [
      { label: UNIFIED_ITEM_LABELS.clientRequests, url: '/dashboard/leads', icon: Inbox },
      { label: UNIFIED_ITEM_LABELS.opportunities, url: '/dashboard/rfq/inbox', icon: Sparkles, badge: { ar: 'جديد', en: 'New', tone: 'new' } },
      { label: UNIFIED_ITEM_LABELS.offers, url: '/dashboard/rfq', icon: FileText },
      { label: UNIFIED_ITEM_LABELS.clients, url: '/dashboard/clients', icon: Users },
      { label: { ar: 'حجز المواعيد', en: 'Bookings' }, url: '/dashboard/bookings', icon: CalendarClock },
    ],
  },
  {
    key: 'operations',
    groupLabel: { ar: 'العمليات', en: 'Operations' },
    icon: Activity,
    description: { ar: 'إدارة أوامر العمل والعقود والضمانات', en: 'Work orders, contracts, and warranties' },
    items: [
      { label: { ar: 'أوامر العمل', en: 'Work Orders' }, url: '/dashboard/work-orders', icon: ClipboardList, end: true, badge: { ar: 'جديد', en: 'New', tone: 'new' } },
      { label: { ar: 'العقود', en: 'Contracts' }, url: '/dashboard/contracts', icon: FileText },
      { label: { ar: 'الضمانات', en: 'Warranties' }, url: '/dashboard/warranties', icon: Shield },
    ],
  },
  {
    key: 'rentals',
    groupLabel: { ar: 'التأجير والأصول', en: 'Rentals & Assets' },
    icon: Truck,
    description: { ar: 'عروض التأجير وأسطول المعدات', en: 'Rental offerings and equipment fleet' },
    items: [
      { label: { ar: 'مركز التأجير', en: 'Rentals' }, url: '/dashboard/rentals', icon: Truck, end: true, badge: { ar: 'جديد', en: 'New', tone: 'new' } },
      { label: { ar: 'تقويم التأجير', en: 'Rentals Calendar' }, url: '/dashboard/rentals/calendar', icon: CalendarClock, badge: { ar: 'جديد', en: 'New', tone: 'new' } },
      { label: { ar: 'تحليلات التأجير', en: 'Rentals Analytics' }, url: '/dashboard/rentals/analytics', icon: BarChart3, badge: { ar: 'جديد', en: 'New', tone: 'new' } },
      { label: { ar: 'الأصول والمعدات', en: 'Assets & Equipment' }, url: '/dashboard/assets', icon: Package },
    ],
  },
  {
    key: 'billing',
    groupLabel: { ar: 'العضوية والفوترة', en: 'Membership & Billing' },
    icon: Crown,
    description: { ar: 'الاشتراكات والرصيد والأقساط', en: 'Subscriptions, credits, and installments' },
    items: [
      { label: UNIFIED_ITEM_LABELS.membership, url: '/dashboard/provider/membership', icon: Crown },
      { label: { ar: 'الأقساط', en: 'Installments' }, url: '/dashboard/installments', icon: CreditCard },
      { label: { ar: 'الولاء', en: 'Loyalty' }, url: '/dashboard/loyalty', icon: Star, badge: { ar: 'جديد', en: 'New', tone: 'new' } },
    ],
  },
  {
    key: 'communication',
    groupLabel: { ar: 'التواصل', en: 'Communication' },
    icon: MessageSquare,
    items: [
      { label: UNIFIED_ITEM_LABELS.messages, url: '/dashboard/messages', icon: MessageSquare },
      { label: UNIFIED_ITEM_LABELS.notifications, url: '/dashboard/notifications', icon: Bell },
    ],
  },
  {
    key: 'account',
    groupLabel: UNIFIED_GROUP_LABELS.account,
    icon: Settings,
    items: [
      { label: UNIFIED_ITEM_LABELS.profile, url: '/dashboard/profile', icon: User },
      { label: { ar: 'تفضيلات التواصل', en: 'Communication Preferences' }, url: '/dashboard/communication-preferences', icon: Settings2 },
      { label: UNIFIED_ITEM_LABELS.team, url: '/dashboard/settings/staff', icon: Users },
      { label: { ar: 'الإعدادات', en: 'Settings' }, url: '/dashboard/settings', icon: Settings },
    ],
  },
];

// ─── USER ──────────────────────────────────────────────────────────
export const userNavGroups: DashboardNavGroup[] = [
  {
    key: 'dashboard',
    groupLabel: UNIFIED_GROUP_LABELS.dashboard,
    icon: LayoutDashboard,
    items: [
      { label: UNIFIED_ITEM_LABELS.overview, url: '/dashboard', icon: LayoutDashboard, end: true },
      { label: UNIFIED_ITEM_LABELS.myRequests, url: '/dashboard/my-requests', icon: Inbox },
      { label: UNIFIED_ITEM_LABELS.messages, url: '/dashboard/messages', icon: MessageSquare },
      { label: UNIFIED_ITEM_LABELS.membership, url: '/dashboard/membership', icon: Crown },
    ],
  },
  {
    key: 'business',
    groupLabel: UNIFIED_GROUP_LABELS.business,
    icon: Wrench,
    description: { ar: 'مواقعك ومشاريعك وعقودك (شخصية أو مرتبطة بمنشأتك)', en: 'Your sites, projects and contracts (personal or business)' },
    items: [
      { label: UNIFIED_ITEM_LABELS.sites, url: '/dashboard/sites', icon: MapPin },
      { label: UNIFIED_ITEM_LABELS.projects, url: '/dashboard/projects', icon: FolderOpen },
      { label: { ar: 'العقود', en: 'Contracts' }, url: '/dashboard/contracts', icon: FileText },
    ],
  },
  {
    key: 'businessEntity',
    groupLabel: UNIFIED_GROUP_LABELS.businessEntity,
    icon: Building2,
    description: { ar: 'بيانات منشأتك وفروعها وفريقها', en: 'Your business profile, branches and team' },
    items: [
      { label: UNIFIED_ITEM_LABELS.branches, url: '/dashboard/branches', icon: Building2, requiresBusiness: true },
      { label: UNIFIED_ITEM_LABELS.businessProfile, url: '/dashboard/business-edit', icon: Building2, requiresBusiness: true },
      { label: UNIFIED_ITEM_LABELS.services, url: '/dashboard/services', icon: Wrench, requiresBusiness: true },
      { label: UNIFIED_ITEM_LABELS.portfolio, url: '/dashboard/portfolio', icon: Image, requiresBusiness: true },
      { label: UNIFIED_ITEM_LABELS.team, url: '/dashboard/settings/staff', icon: Users, requiresBusiness: true },
      { label: UNIFIED_ITEM_LABELS.visibility, url: '/dashboard/badge', icon: ShieldCheck, requiresBusiness: true },
    ],
  },
  {
    key: 'account',
    groupLabel: UNIFIED_GROUP_LABELS.account,
    icon: User,
    items: [
      { label: UNIFIED_ITEM_LABELS.profile, url: '/dashboard/profile', icon: User },
      { label: UNIFIED_ITEM_LABELS.notifications, url: '/dashboard/notifications', icon: Bell },
      { label: { ar: 'تفضيلات التواصل', en: 'Communication Preferences' }, url: '/dashboard/communication-preferences', icon: Settings2 },
      { label: { ar: 'الإعدادات', en: 'Settings' }, url: '/dashboard/settings', icon: Settings },
    ],
  },
];

// ─── ADMIN (registry-driven) ───────────────────────────────────────
export const adminNavGroups: DashboardNavGroup[] = ADMIN_NAV_GROUPS.map((g) => ({
  key: `admin:${g.labelEn}`,
  groupLabel: { ar: g.labelAr, en: g.labelEn },
  icon: g.icon,
  description: g.descriptionAr && g.descriptionEn
    ? { ar: g.descriptionAr, en: g.descriptionEn }
    : undefined,
  items: g.items
    .filter((it) => !it.hiddenInSidebar)
    .map((it) => ({
      label: { ar: it.labelAr, en: it.labelEn },
      url: it.route,
      icon: it.icon,
      superAdminOnly: it.permission === 'super_admin',
      badge: it.badge,
    })),
})).filter((g) => g.items.length > 0);

// Mail icon kept imported for future Communication expansion.
void Mail;