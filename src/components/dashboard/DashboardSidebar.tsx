import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { NavLink } from '@/components/NavLink';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveWorkspace } from '@/hooks/useActiveWorkspace';
import { canViewWorkspaceRoute } from '@/modules/workspace/permissions/routePermissions';
import { useVisibleModules } from '@/hooks/useVisibleModules';
import { Separator } from '@/components/ui/separator';
import { SidebarBrand } from '@/components/dashboard/navigation/SidebarBrand';
import { SidebarQuickCreate } from '@/components/dashboard/navigation/SidebarQuickCreate';
import { SidebarFavorites } from '@/components/dashboard/navigation/SidebarFavorites';
import {
  LayoutDashboard, Wrench, Image, Star, FileText, Shield, Settings, LogOut,
  Home, Globe, CreditCard, Megaphone, Key, Book, FolderOpen, PenSquare,
  Layers, MessageSquare, Users, Newspaper, Building2, Bell, Activity,
  Bookmark, ShieldAlert, Crown, FolderTree, Tags, UserCog, Database,
  BarChart3, Cog, Eye, TrendingUp, AlertTriangle, Server, Brain,
  CalendarClock, Gauge,
  Mail,
  Search as SearchIcon,
  ShieldCheck,
  Palette,
  Inbox,
  Settings2,
  MapPin,
  Beaker,
  QrCode,
  User,
  UserPlus,
  ClipboardList,
  ChevronDown,
} from 'lucide-react';

interface MenuItem {
  label: { ar: string; en: string };
  url: string;
  icon: React.ElementType;
  end?: boolean;
  superAdminOnly?: boolean;
  /** Optional static badge — must not require a query. */
  badge?: { ar: string; en: string; tone?: 'new' | 'support' | 'neutral' };
}

interface MenuGroup {
  groupLabel: { ar: string; en: string };
  icon: React.ElementType;
  items: MenuItem[];
  /** Optional short bilingual description shown under the group label. */
  description?: { ar: string; en: string };
}

// ══════════════════════════════════════════
//  مزود الخدمة — Provider Menu
// ══════════════════════════════════════════
const providerGroups: MenuGroup[] = [
  {
    groupLabel: { ar: 'نظرة عامة', en: 'Overview' },
    icon: LayoutDashboard,
    items: [
      { label: { ar: 'لوحة التحكم', en: 'Dashboard' }, url: '/dashboard', icon: LayoutDashboard, end: true },
      { label: { ar: 'التحليلات', en: 'Analytics' }, url: '/dashboard/analytics', icon: BarChart3 },
      { label: { ar: 'سجل العمليات', en: 'Operations Feed' }, url: '/dashboard/operations/feed', icon: Activity, badge: { ar: 'جديد', en: 'New', tone: 'new' } },
    ],
  },
  {
    groupLabel: { ar: 'ملف المنشأة', en: 'Business Profile' },
    icon: Wrench,
    items: [
      { label: { ar: 'بيانات المنشأة', en: 'Business Profile' }, url: '/dashboard/business-edit', icon: Building2 },
      { label: { ar: 'الخدمات', en: 'Services' }, url: '/dashboard/services', icon: Wrench },
      { label: { ar: 'معرض الأعمال', en: 'Portfolio' }, url: '/dashboard/portfolio', icon: Image },
      { label: { ar: 'المشاريع', en: 'Projects' }, url: '/dashboard/projects', icon: FolderOpen },
      { label: { ar: 'العروض', en: 'Promotions' }, url: '/dashboard/promotions', icon: Megaphone },
      { label: { ar: 'مناطق الخدمة', en: 'Service Areas' }, url: '/dashboard/provider/service-areas', icon: MapPin },
      { label: { ar: 'القطاعات الخاصة', en: 'Private Sectors' }, url: '/dashboard/private-sectors', icon: Layers },
      { label: { ar: 'التقييمات', en: 'Reviews' }, url: '/dashboard/reviews', icon: Star },
      { label: { ar: 'شارة التوثيق', en: 'Verification Badge' }, url: '/dashboard/badge', icon: ShieldCheck },
    ],
  },
  {
    groupLabel: { ar: 'المبيعات والطلبات', en: 'Sales & Requests' },
    icon: Inbox,
    items: [
      { label: { ar: 'الطلبات والفرص', en: 'Requests & Opportunities' }, url: '/dashboard/leads', icon: Inbox },
      { label: { ar: 'حجز المواعيد', en: 'Bookings' }, url: '/dashboard/bookings', icon: CalendarClock },
      { label: { ar: 'العملاء', en: 'Clients' }, url: '/dashboard/clients', icon: Users },
      { label: { ar: 'عروض الأسعار RFQ', en: 'RFQ' }, url: '/dashboard/rfq', icon: FileText, badge: { ar: 'جديد', en: 'New', tone: 'new' } },
    ],
  },
  {
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
    groupLabel: { ar: 'العضوية والفوترة', en: 'Membership & Billing' },
    icon: Crown,
    description: { ar: 'الاشتراكات والرصيد والأقساط', en: 'Subscriptions, credits, and installments' },
    items: [
      { label: { ar: 'العضوية', en: 'Membership' }, url: '/dashboard/provider/membership', icon: Crown },
      { label: { ar: 'الأقساط', en: 'Installments' }, url: '/dashboard/installments', icon: CreditCard },
      { label: { ar: 'الولاء', en: 'Loyalty' }, url: '/dashboard/loyalty', icon: Star, badge: { ar: 'جديد', en: 'New', tone: 'new' } },
    ],
  },
  {
    groupLabel: { ar: 'التواصل', en: 'Communication' },
    icon: MessageSquare,
    items: [
      { label: { ar: 'الرسائل', en: 'Messages' }, url: '/dashboard/messages', icon: MessageSquare },
      { label: { ar: 'الإشعارات', en: 'Notifications' }, url: '/dashboard/notifications', icon: Bell },
    ],
  },
  {
    groupLabel: { ar: 'الإعدادات', en: 'Settings' },
    icon: Settings,
    items: [
      { label: { ar: 'الملف الشخصي', en: 'Profile' }, url: '/dashboard/profile', icon: User },
      { label: { ar: 'تفضيلات التواصل', en: 'Communication Preferences' }, url: '/dashboard/communication-preferences', icon: Settings2 },
      { label: { ar: 'الموظفون', en: 'Staff' }, url: '/dashboard/settings/staff', icon: Users },
      { label: { ar: 'الإعدادات', en: 'Settings' }, url: '/dashboard/settings', icon: Settings },
    ],
  },
];

// ══════════════════════════════════════════
//  المستخدم العادي — User Menu
// ══════════════════════════════════════════
const userGroups: MenuGroup[] = [
  {
    groupLabel: { ar: 'نظرة عامة', en: 'Overview' },
    icon: LayoutDashboard,
    items: [
      { label: { ar: 'لوحة التحكم', en: 'Dashboard' }, url: '/dashboard', icon: LayoutDashboard, end: true },
    ],
  },
  {
    groupLabel: { ar: 'نشاطي', en: 'My Activity' },
    icon: FileText,
    items: [
      { label: { ar: 'جهاتي', en: 'My Entities' }, url: '/dashboard/entities', icon: Building2 },
      { label: { ar: 'طلباتي', en: 'My Requests' }, url: '/dashboard/my-requests', icon: Inbox },
      { label: { ar: 'العقود', en: 'Contracts' }, url: '/dashboard/contracts', icon: FileText },
      { label: { ar: 'حجز المواعيد', en: 'Bookings' }, url: '/dashboard/bookings', icon: CalendarClock },
      { label: { ar: 'الأقساط', en: 'Installments' }, url: '/dashboard/installments', icon: CreditCard },
    ],
  },
  {
    groupLabel: { ar: 'التواصل', en: 'Communication' },
    icon: MessageSquare,
    items: [
      { label: { ar: 'الرسائل', en: 'Messages' }, url: '/dashboard/messages', icon: MessageSquare },
      { label: { ar: 'الإشعارات', en: 'Notifications' }, url: '/dashboard/notifications', icon: Bell },
    ],
  },
  {
    groupLabel: { ar: 'المزيد', en: 'More' },
    icon: Bookmark,
    items: [
      { label: { ar: 'المفضلة', en: 'Bookmarks' }, url: '/dashboard/bookmarks', icon: Bookmark },
    ],
  },
  {
    groupLabel: { ar: 'الإعدادات', en: 'Settings' },
    icon: Settings,
    items: [
      { label: { ar: 'الملف الشخصي', en: 'Profile' }, url: '/dashboard/profile', icon: User },
      { label: { ar: 'تفضيلات التواصل', en: 'Communication Preferences' }, url: '/dashboard/communication-preferences', icon: Settings2 },
      { label: { ar: 'الإعدادات', en: 'Settings' }, url: '/dashboard/settings', icon: Settings },
    ],
  },
];

// ══════════════════════════════════════════
//  المشرف — Admin-Only Base Menu
//  (replaces user/provider base when admin)
//
//  ADMIN-SIDEBAR-UX-RESTRUCTURE-2:
//  Professional 9-group structure. No duplicate hrefs. Every link
//  resolves to a route registered in App.tsx. Items flagged
//  `superAdminOnly` are hidden for non-super admins.
//
//  Hidden / deep-link-only admin routes (intentionally not in sidebar):
//   - /admin/users, /admin/users/:id   → superseded by /admin/identity
//   - /admin/businesses                → direct CRUD; also linked from Account Center
//   - /admin/quote-requests(/:id)      → opened from Quote Operations
//   - /admin/pdf-visual-qa             → opened from PDF Export Audit
//   - /admin/contracts/analytics       → opened from Contracts dashboard
//   - /admin/diagnostics               → ops deep link
//   - /admin/showcase                  → opened from Dashboard Showcase
//   - /admin/locations/{catalog,service-areas,business-coordinates}
//                                      → sub-pages of /admin/locations
//   - /admin/contact-{inbox-settings,audit-log,sla-dashboard,notification-log}
//                                      → redirected into /admin/contact-messages tabs
// ══════════════════════════════════════════
const adminBaseGroups: MenuGroup[] = [
  {
    // 1) Overview
    groupLabel: { ar: 'نظرة عامة', en: 'Overview' },
    icon: LayoutDashboard,
    description: { ar: 'لوحات المراقبة والعمليات والمراجع', en: 'Dashboards, operations, and references' },
    items: [
      { label: { ar: 'لوحة التحكم', en: 'Dashboard' }, url: '/dashboard', icon: LayoutDashboard, end: true },
      { label: { ar: 'سجل النشاط', en: 'Activity Log' }, url: '/admin/activity-log', icon: Activity },
      { label: { ar: 'تشغيل المهام', en: 'Cron Runs' }, url: '/admin/cron-runs', icon: CalendarClock },
      { label: { ar: 'مركز العمليات', en: 'Operations Center' }, url: '/admin/operations', icon: Activity },
      { label: { ar: 'فحص المراجع المتعدد', en: 'Bulk Reference Triage' }, url: '/admin/ref/triage', icon: SearchIcon, badge: { ar: 'دعم', en: 'Support', tone: 'support' } },
    ],
  },
  {
    // 2) Identities & Entities — unified hub for users, admin team,
    //    disabled accounts, businesses, providers, access requests,
    //    access management, and locations. Previously split across
    //    "Users & Access" + "Businesses & Providers" which duplicated
    //    the Account Center destination and fragmented the journey
    //    between a user and the businesses they manage.
    groupLabel: { ar: 'المستخدمون والمنشآت', en: 'Users & Businesses' },
    icon: Users,
    items: [
      // People
      { label: { ar: 'مركز الحسابات', en: 'Account Center' }, url: '/admin/identity', icon: Users, end: true },
      // Entities (direct CRUD page)
      { label: { ar: 'المنشآت والكيانات', en: 'Businesses & Entities' }, url: '/admin/businesses', icon: Building2 },
      // Access lifecycle
      { label: { ar: 'طلبات الانضمام', en: 'Access Requests' }, url: '/admin/entity-access-requests', icon: UserPlus },
      { label: { ar: 'إدارة الوصول', en: 'Access Management' }, url: '/admin/access-management', icon: Shield, superAdminOnly: true },
      { label: { ar: 'إظهار الأنظمة', en: 'System Access' }, url: '/admin/system-access', icon: Layers },
      // Provider operations
      { label: { ar: 'مركز مراجعة المزودين', en: 'Provider Review Center' }, url: '/admin/provider-review', icon: ShieldCheck },
      // Geographic context
      { label: { ar: 'مركز المواقع', en: 'Locations Center' }, url: '/admin/locations', icon: MapPin },
    ],
  },
  {
    // 4) Requests & Contracts
    groupLabel: { ar: 'الطلبات والعقود', en: 'Requests & Contracts' },
    icon: FileText,
    items: [
      { label: { ar: 'طلبات العملاء', en: 'Customer Requests' }, url: '/admin/lead-requests', icon: Inbox },
      { label: { ar: 'تشغيل عروض الأسعار', en: 'Quote Operations' }, url: '/admin/quote-operations', icon: Activity },
      { label: { ar: 'مركز إدارة العقود', en: 'Contracts Center' }, url: '/admin/contracts', icon: FileText },
      { label: { ar: 'مركز التقارير', en: 'Reports Center' }, url: '/admin/reports', icon: BarChart3 },
      { label: { ar: 'سجل التدقيق الموحّد', en: 'Unified Audit Log' }, url: '/admin/audit-log', icon: ShieldAlert },
    ],
  },
  {
    // 5) Memberships & Payments
    groupLabel: { ar: 'العضويات والمدفوعات', en: 'Memberships & Payments' },
    icon: Crown,
    items: [
      { label: { ar: 'مركز العضويات', en: 'Memberships Center' }, url: '/admin/memberships', icon: Crown },
    ],
  },
  {
    // 6) Communications
    groupLabel: { ar: 'التواصل', en: 'Communications' },
    icon: Mail,
    items: [
      { label: { ar: 'مركز التواصل', en: 'Contact Center' }, url: '/admin/contact-messages', icon: MessageSquare },
      { label: { ar: 'مركز البريد', en: 'Email Center' }, url: '/admin/email-center', icon: Mail },
      { label: { ar: 'كل المحادثات', en: 'Conversations' }, url: '/dashboard/messages', icon: MessageSquare, superAdminOnly: true },
    ],
  },
  {
    // 7) Content & SEO
    groupLabel: { ar: 'المحتوى والـ SEO', en: 'Content & SEO' },
    icon: Database,
    items: [
      { label: { ar: 'المدونة', en: 'Blog' }, url: '/dashboard/blog', icon: PenSquare },
      { label: { ar: 'التصنيفات والوسوم', en: 'Categories & Tags' }, url: '/admin/categories', icon: FolderTree },
      { label: { ar: 'القطاعات', en: 'Sectors' }, url: '/dashboard/profile-systems', icon: Layers },
      { label: { ar: 'القطاعات الخاصة', en: 'Private Sectors' }, url: '/admin/private-sectors', icon: Layers },
      { label: { ar: 'مركز SEO', en: 'SEO Center' }, url: '/admin/sitemap-status', icon: SearchIcon },
    ],
  },
  {
    // 8) Operations & Insights
    groupLabel: { ar: 'التشغيل والتحليلات', en: 'Operations & Insights' },
    icon: Activity,
    items: [
      { label: { ar: 'سجل الأكواد', en: 'Barcode Registry' }, url: '/admin/barcode-registry', icon: QrCode },
      { label: { ar: 'مراقبة المواقع', en: 'Site Monitoring' }, url: '/admin/client-sites', icon: MapPin },
      { label: { ar: 'تحليلات السوق', en: 'Market Analytics' }, url: '/admin/market-analytics', icon: TrendingUp },
      { label: { ar: 'مركز الذكاء', en: 'AI Center' }, url: '/admin/ai-center', icon: Brain },
      { label: { ar: 'تجارب A/B', en: 'A/B Experiments' }, url: '/admin/ab-experiments', icon: Beaker },
    ],
  },
  {
    // 9) Settings & Integrations
    groupLabel: { ar: 'الإعدادات والتكاملات', en: 'Settings & Integrations' },
    icon: Cog,
    items: [
      { label: { ar: 'إعدادات النظام', en: 'System Settings' }, url: '/admin/system-settings', icon: Cog, superAdminOnly: true },
    ],
  },
  {
    // 10) Account (personal)
    groupLabel: { ar: 'الحساب', en: 'Account' },
    icon: User,
    items: [
      { label: { ar: 'الملف الشخصي', en: 'Profile' }, url: '/dashboard/profile', icon: User },
      { label: { ar: 'الإشعارات', en: 'Notifications' }, url: '/dashboard/notifications', icon: Bell },
      { label: { ar: 'تفضيلات التواصل', en: 'Communication Preferences' }, url: '/dashboard/communication-preferences', icon: Settings2 },
      { label: { ar: 'الإعدادات', en: 'Settings' }, url: '/dashboard/settings', icon: Settings },
    ],
  },
];

// ══════════════════════════════════════════
//  Render helpers
// ══════════════════════════════════════════

/**
 * Best-match active resolver. For a given pathname, returns the single
 * URL among `urls` whose path is the longest prefix of pathname (or an
 * exact match). This avoids highlighting both "Work Orders" and
 * "Operations Overview" when the URL is /dashboard/work-orders/overview,
 * and similar parent/child overlaps for /admin/operations/console and
 * /admin/ref/<id>.
 */
const resolveBestMatch = (pathname: string, urls: string[]): string | null => {
  // Strip query, normalise trailing slash
  const path = (pathname || '/').split('?')[0].replace(/\/+$/, '') || '/';
  let best: string | null = null;
  let bestLen = -1;
  for (const raw of urls) {
    const u = raw.split('?')[0].replace(/\/+$/, '') || '/';
    const isMatch = path === u || path.startsWith(u + '/');
    if (isMatch && u.length > bestLen) {
      best = raw; // keep original (with query) for equality compare
      bestLen = u.length;
    }
  }
  return best;
};

const BadgePill: React.FC<{ tone?: 'new' | 'support' | 'neutral'; children: React.ReactNode }> = ({ tone = 'neutral', children }) => {
  const cls =
    tone === 'new'
      ? 'bg-primary/15 text-primary border-primary/25'
      : tone === 'support'
      ? 'bg-accent/15 text-accent border-accent/25'
      : 'bg-muted text-muted-foreground border-border';
  return (
    <span className={`ms-auto shrink-0 rounded-md border px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide leading-none ${cls}`}>
      {children}
    </span>
  );
};

// ──────────────────────────────────────────────────────────
// Collapsible group state — persisted per group key.
// Items: open=true means the group is expanded.
// ──────────────────────────────────────────────────────────
const SIDEBAR_GROUPS_LS_KEY = 'qitaat_sidebar_groups_v1';

function readGroupState(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(SIDEBAR_GROUPS_LS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}

function useSidebarGroupCollapse() {
  const [state, setState] = React.useState<Record<string, boolean>>(() => readGroupState());
  const setOpen = React.useCallback((key: string, open: boolean) => {
    setState((prev) => {
      const next = { ...prev, [key]: open };
      try { localStorage.setItem(SIDEBAR_GROUPS_LS_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);
  return { state, setOpen };
}

const RenderMenu: React.FC<{
  items: MenuItem[];
  collapsed: boolean;
  isRTL: boolean;
  closeMobile: () => void;
  bestActiveUrl: string | null;
}> = ({ items, collapsed, isRTL, closeMobile, bestActiveUrl }) => (
  <SidebarMenu>
    {items.map((item) => {
      const label = isRTL ? item.label.ar : item.label.en;
      const isActive = item.url === bestActiveUrl;
      const badgeLabel = item.badge ? (isRTL ? item.badge.ar : item.badge.en) : null;
      return (
        <SidebarMenuItem key={item.url + item.label.en}>
          <SidebarMenuButton
            asChild
            tooltip={collapsed ? label : undefined}
            isActive={isActive}
            className="min-h-9 sm:min-h-9"
          >
            <NavLink
              to={item.url}
              title={collapsed ? label : undefined}
              aria-label={label}
              aria-current={isActive ? 'page' : undefined}
              className={
                'relative rounded-lg transition-colors outline-none ' +
                'focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-0 ' +
                (isActive
                  ? 'bg-primary/12 text-primary font-semibold dark:bg-primary/18 dark:text-primary-foreground ' +
                    'before:absolute before:inset-y-1 before:start-0 before:w-[3px] before:rounded-full before:bg-primary'
                  : 'text-sidebar-foreground/85 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground')
              }
              activeClassName=""
              onClick={closeMobile}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="ms-2 truncate">{label}</span>}
              {!collapsed && badgeLabel ? <BadgePill tone={item.badge?.tone}>{badgeLabel}</BadgePill> : null}
            </NavLink>
          </SidebarMenuButton>
        </SidebarMenuItem>
      );
    })}
  </SidebarMenu>
);

const RenderGroups: React.FC<{
  groups: MenuGroup[];
  collapsed: boolean;
  isRTL: boolean;
  closeMobile: () => void;
  isSuperAdmin?: boolean;
  pathname: string;
  isAdmin?: boolean;
  workspace?: { active_role: string | null; permissions: string[] } | null;
  isRouteHidden?: (path: string) => boolean;
}> = ({ groups, collapsed, isRTL, closeMobile, isSuperAdmin = false, pathname, isAdmin = false, workspace = null, isRouteHidden }) => {
  const { state: groupOpenState, setOpen: setGroupOpen } = useSidebarGroupCollapse();
  // ORG-RBAC-STRUCTURE-1 — Phase D
  // Centralized visibility: admin override always wins; owner short-circuits;
  // unmapped routes fall through to legacy (visible) behavior. RLS remains
  // authoritative on the server.
  const canView = (url: string): boolean => {
    if (isRouteHidden && isRouteHidden(url)) return false;
    return canViewWorkspaceRoute(url, { workspace, isAdmin: isAdmin || isSuperAdmin });
  };
  // Compute best-match across ALL visible items in ALL groups, then
  // pass it down. This prevents two sidebar entries (e.g. "Work Orders"
  // and "Operations Overview") from both highlighting on a nested route.
  const allUrls: string[] = [];
  for (const g of groups) {
    for (const it of g.items) {
      if (it.superAdminOnly && !isSuperAdmin) continue;
      if (!canView(it.url)) continue;
      // For `end:true` items we still feed them into the resolver — the
      // longest-prefix rule already gives the correct exact-match winner.
      allUrls.push(it.url);
    }
  }
  const bestActiveUrl = resolveBestMatch(pathname, allUrls);

  return (
  <div className="space-y-1">
    {groups.map((group, gi) => {
      const visibleItems = group.items.filter(
        (item) => (!item.superAdminOnly || isSuperAdmin) && canView(item.url),
      );
      if (visibleItems.length === 0) return null;
      const groupKey = group.groupLabel.en;
      // Auto-expand the group that contains the active route. Otherwise
      // use the user's persisted preference; default open for the first
      // group, default closed for the rest to reduce visual noise.
      const containsActive = bestActiveUrl != null && visibleItems.some((it) => it.url === bestActiveUrl);
      const storedOpen = groupOpenState[groupKey];
      const isOpen = collapsed
        ? true
        : containsActive
          ? true
          : (storedOpen ?? gi === 0);
      return (
        <SidebarGroup key={group.groupLabel.en} className={gi > 0 && !collapsed ? 'mt-1.5 pt-1.5 border-t border-sidebar-border/60' : ''}>
          <SidebarGroupLabel asChild>
            {!collapsed ? (
              <button
                type="button"
                onClick={() => setGroupOpen(groupKey, !isOpen)}
                aria-expanded={isOpen}
                aria-controls={`sidebar-group-${groupKey}`}
                className="group/grp w-full flex items-center gap-1.5 px-2 py-1 rounded-md text-[10.5px] font-semibold uppercase tracking-[0.08em] text-sidebar-foreground/55 hover:text-sidebar-foreground hover:bg-sidebar-accent/60 transition-colors"
              >
                <group.icon className="w-3 h-3 opacity-70 shrink-0" />
                <span className="truncate">{isRTL ? group.groupLabel.ar : group.groupLabel.en}</span>
                <span className="ms-auto inline-flex items-center gap-1 text-[9px] font-normal text-sidebar-foreground/40">
                  <span className="tabular-nums">{visibleItems.length}</span>
                  <ChevronDown
                    className={`w-3 h-3 transition-transform duration-200 ${isOpen ? 'rotate-0' : '-rotate-90'}`}
                    aria-hidden="true"
                  />
                </span>
              </button>
            ) : <span />}
          </SidebarGroupLabel>
          {!collapsed && isOpen && group.description ? (
            <p className="px-2 mb-1 text-[10.5px] text-sidebar-foreground/50 leading-snug">
              {isRTL ? group.description.ar : group.description.en}
            </p>
          ) : null}
          {isOpen && (
            <SidebarGroupContent id={`sidebar-group-${groupKey}`}>
              <RenderMenu
                items={visibleItems}
                collapsed={collapsed}
                isRTL={isRTL}
                closeMobile={closeMobile}
                bestActiveUrl={bestActiveUrl}
              />
            </SidebarGroupContent>
          )}
        </SidebarGroup>
      );
    })}
  </div>
  );
};

export const DashboardSidebar: React.FC = () => {
  const { state, setOpenMobile, isMobile } = useSidebar();
  const collapsed = state === 'collapsed';
  const { language, setLanguage, isRTL } = useLanguage();
  const { signOut, isAdmin, isSuperAdmin, isProvider } = useAuth();
  const workspace = useActiveWorkspace();
  const { isRouteHidden } = useVisibleModules();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const closeMobile = () => { if (isMobile) setOpenMobile(false); };
  const handleLogout = async () => { await signOut(); navigate('/'); };

  // Admin gets admin-specific base menu, not user/provider menu
  const baseGroups = isAdmin ? adminBaseGroups : (isProvider ? providerGroups : userGroups);

  // Build a url → label lookup once per render. Favorites and Recent
  // resolve their display label from this so renames stay in sync and
  // unknown URLs are silently dropped from those sections.
  const labelLookup = React.useMemo(() => {
    const m = new Map<string, { ar: string; en: string }>();
    for (const g of baseGroups) {
      for (const it of g.items) m.set(it.url, it.label);
    }
    return m;
  }, [baseGroups]);

  const audience: 'provider' | 'admin' | 'user' = isAdmin ? 'admin' : isProvider ? 'provider' : 'user';

  return (
    <Sidebar collapsible="icon" side={isRTL ? 'right' : 'left'}>
      <SidebarContent>
        {/* Brand mark (supports active business logo + fallback) */}
        <SidebarBrand collapsed={collapsed} isRTL={isRTL} />

        {/* Admin badge */}
        {isAdmin && !collapsed && (
          <div className="mx-3 mt-2 mb-1 px-3 py-1.5 rounded-lg bg-accent/10 dark:bg-accent/15 border border-accent/20">
            <p className="text-[10px] font-bold text-accent flex items-center gap-1.5">
              <ShieldAlert className="w-3 h-3" />
              {isRTL
                ? (isSuperAdmin ? 'لوحة الإدارة العليا' : 'لوحة الإدارة')
                : (isSuperAdmin ? 'Super Admin Panel' : 'Admin Panel')}
            </p>
          </div>
        )}
        {isAdmin && collapsed && (
          <div className="flex justify-center mt-2 mb-1">
            <ShieldAlert className="w-4 h-4 text-accent" />
          </div>
        )}

        {/* Active workspace context — clarifies role inside current business */}
        {!isAdmin && !collapsed && workspace.active_entity_id && (() => {
          const activeEntity = workspace.entities.find(e => e.entity_id === workspace.active_entity_id);
          if (!activeEntity) return null;
          const role = workspace.active_role;
          const roleLabel = role === 'owner'
            ? (isRTL ? 'مالك' : 'Owner')
            : role === 'manager' || role === 'business_manager'
              ? (isRTL ? 'مدير' : 'Manager')
              : role
                ? (isRTL ? 'موظف' : 'Staff')
                : (isRTL ? 'مزود خدمة' : 'Provider');
          const name = (isRTL ? activeEntity.name_ar : activeEntity.name_en) || activeEntity.name_ar || activeEntity.name_en || '—';
          return (
            <div className="mx-3 mt-2 mb-1 px-3 py-2 rounded-lg bg-primary/5 border border-primary/15">
              <p className="text-[9px] uppercase tracking-wide text-sidebar-foreground/55 mb-0.5">
                {isRTL ? 'تتصفح الآن كـ' : 'You are browsing as'}
              </p>
              <p className="text-[11px] font-bold text-sidebar-foreground leading-tight truncate" dir="auto">
                {roleLabel} <span className="text-sidebar-foreground/55 font-normal">{isRTL ? 'في' : 'in'}</span> {name}
              </p>
            </div>
          );
        })()}

        {/* Quick Create — five always-visible shortcuts */}
        <SidebarQuickCreate
          collapsed={collapsed}
          isRTL={isRTL}
          audience={audience}
          closeMobile={closeMobile}
          isRouteHidden={isRouteHidden}
        />

        {/* Pinned favorites + recently visited */}
        <SidebarFavorites
          collapsed={collapsed}
          isRTL={isRTL}
          labelLookup={labelLookup}
          closeMobile={closeMobile}
          isRouteHidden={isRouteHidden}
        />

        {/* ─── Role-based menu ─── */}
        <RenderGroups
          groups={baseGroups}
          collapsed={collapsed}
          isRTL={isRTL}
          closeMobile={closeMobile}
          isSuperAdmin={isSuperAdmin}
          isAdmin={isAdmin}
          workspace={{ active_role: workspace.active_role, permissions: workspace.permissions }}
          pathname={pathname}
          isRouteHidden={isRouteHidden}
        />
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3 space-y-1">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip={collapsed ? (isRTL ? 'الرئيسية' : 'Home') : undefined}>
              <NavLink
                to="/"
                aria-label={isRTL ? 'الرئيسية' : 'Home'}
                className="rounded-lg text-sidebar-foreground/85 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                activeClassName=""
                onClick={closeMobile}
              >
                <Home className="h-4 w-4 shrink-0" />
                {!collapsed && <span className="ms-2">{isRTL ? 'الرئيسية' : 'Home'}</span>}
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
              tooltip={collapsed ? (language === 'ar' ? 'English' : 'العربية') : undefined}
              aria-label={language === 'ar' ? 'Switch to English' : 'تبديل إلى العربية'}
              className="rounded-lg text-sidebar-foreground/85 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              <Globe className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="ms-2">{language === 'ar' ? 'EN' : 'عربي'}</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleLogout}
              tooltip={collapsed ? (isRTL ? 'تسجيل الخروج' : 'Logout') : undefined}
              aria-label={isRTL ? 'تسجيل الخروج' : 'Logout'}
              className="text-destructive hover:text-destructive hover:bg-destructive/10 dark:hover:bg-destructive/20 rounded-lg"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="ms-2">{isRTL ? 'تسجيل الخروج' : 'Logout'}</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
};
