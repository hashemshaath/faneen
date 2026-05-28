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
import { Link } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Separator } from '@/components/ui/separator';
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
      { label: { ar: 'نظرة عامة على العمليات', en: 'Operations Overview' }, url: '/dashboard/work-orders/overview', icon: ClipboardList },
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
      { label: { ar: 'طلبات الخدمة', en: 'Service Requests' }, url: '/dashboard/leads', icon: Inbox },
      { label: { ar: 'فرص عروض الأسعار', en: 'Quote Opportunities' }, url: '/dashboard/provider/leads', icon: Inbox },
      { label: { ar: 'حجز المواعيد', en: 'Bookings' }, url: '/dashboard/bookings', icon: CalendarClock },
      { label: { ar: 'العملاء', en: 'Clients' }, url: '/dashboard/clients', icon: Users },
    ],
  },
  {
    groupLabel: { ar: 'العمليات', en: 'Operations' },
    icon: Activity,
    description: { ar: 'إدارة أوامر العمل والعقود والضمانات', en: 'Work orders, contracts, and warranties' },
    items: [
      { label: { ar: 'أوامر العمل', en: 'Work Orders' }, url: '/dashboard/work-orders', icon: ClipboardList, end: true, badge: { ar: 'جديد', en: 'New', tone: 'new' } },
      { label: { ar: 'العقود', en: 'Contracts' }, url: '/dashboard/contracts', icon: FileText },
      { label: { ar: 'تحليلات العقود', en: 'Contract Analytics' }, url: '/dashboard/contract-analytics', icon: BarChart3 },
      { label: { ar: 'الضمانات', en: 'Warranties' }, url: '/dashboard/warranties', icon: Shield },
    ],
  },
  {
    groupLabel: { ar: 'العضوية والفوترة', en: 'Membership & Billing' },
    icon: Crown,
    description: { ar: 'الاشتراكات والرصيد والأقساط', en: 'Subscriptions, credits, and installments' },
    items: [
      { label: { ar: 'العضوية', en: 'Membership' }, url: '/membership', icon: Crown },
      { label: { ar: 'العضوية والرصيد', en: 'Provider Membership' }, url: '/dashboard/provider/membership', icon: Crown },
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
//   - /admin/businesses                → superseded by /admin/identity?view=businesses
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
      { label: { ar: 'لوحة العمليات', en: 'Operations' }, url: '/admin/operations', icon: Activity, end: true },
      { label: { ar: 'مركز العمليات', en: 'Operations Console' }, url: '/admin/operations/console', icon: ShieldCheck },
      { label: { ar: 'فحص المراجع المتعدد', en: 'Bulk Reference Triage' }, url: '/admin/ref/triage', icon: SearchIcon, badge: { ar: 'دعم', en: 'Support', tone: 'support' } },
    ],
  },
  {
    // 2) Users & Access
    groupLabel: { ar: 'المستخدمون والوصول', en: 'Users & Access' },
    icon: Users,
    items: [
      { label: { ar: 'مركز الحسابات', en: 'Account Center' }, url: '/admin/identity', icon: Users, end: true },
      { label: { ar: 'المستخدمون', en: 'Users' }, url: '/admin/identity?view=users', icon: User },
      { label: { ar: 'فريق الإدارة', en: 'Admin Team' }, url: '/admin/identity?view=staff', icon: Crown, superAdminOnly: true },
      { label: { ar: 'حسابات معطّلة', en: 'Disabled Accounts' }, url: '/admin/identity?view=disabled', icon: ShieldAlert },
      { label: { ar: 'طلبات الانضمام', en: 'Access Requests' }, url: '/admin/entity-access-requests', icon: UserPlus },
      { label: { ar: 'إدارة الوصول', en: 'Access Management' }, url: '/admin/access-management', icon: Shield, superAdminOnly: true },
    ],
  },
  {
    // 3) Businesses & Providers
    groupLabel: { ar: 'المنشآت والمزودون', en: 'Businesses & Providers' },
    icon: Building2,
    items: [
      { label: { ar: 'المنشآت والكيانات', en: 'Businesses & Entities' }, url: '/admin/identity?view=businesses', icon: Building2 },
      { label: { ar: 'مراجعة المزودين', en: 'Provider Review' }, url: '/admin/provider-review', icon: ShieldCheck },
      { label: { ar: 'تحليلات المزودين', en: 'Provider Analytics' }, url: '/admin/provider-analytics', icon: TrendingUp },
      { label: { ar: 'صفحة هبوط المزودين', en: 'Provider Landing Page' }, url: '/admin/provider-landing', icon: Gauge },
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
      { label: { ar: 'العقود', en: 'Contracts' }, url: '/dashboard/contracts', icon: FileText },
      { label: { ar: 'قوالب العقود', en: 'Contract Templates' }, url: '/admin/contract-templates', icon: FileText },
      { label: { ar: 'سجل تصدير العقود', en: 'Contract Export Audit' }, url: '/admin/pdf-exports', icon: FileText },
    ],
  },
  {
    // 5) Memberships & Payments
    groupLabel: { ar: 'العضويات والمدفوعات', en: 'Memberships & Payments' },
    icon: Crown,
    items: [
      { label: { ar: 'العضويات', en: 'Memberships' }, url: '/admin/memberships', icon: Crown },
      { label: { ar: 'عضويات المزودين', en: 'Provider Memberships' }, url: '/admin/provider-subscriptions', icon: Crown },
      { label: { ar: 'مدفوعات العضويات', en: 'Membership Payments' }, url: '/admin/membership-payments', icon: CreditCard },
      { label: { ar: 'سجل أحداث الاشتراكات', en: 'Subscription Events' }, url: '/admin/membership-events', icon: ShieldAlert, superAdminOnly: true },
      { label: { ar: 'تدقيق رفض الترقيات', en: 'Upgrade Rejection Audit' }, url: '/admin/membership-rejections', icon: ShieldAlert, superAdminOnly: true },
    ],
  },
  {
    // 6) Communications
    groupLabel: { ar: 'التواصل', en: 'Communications' },
    icon: Mail,
    items: [
      { label: { ar: 'مركز التواصل', en: 'Contact Center' }, url: '/admin/contact-messages', icon: MessageSquare },
      { label: { ar: 'مركز البريد', en: 'Email Center' }, url: '/admin/email-center', icon: Mail },
      { label: { ar: 'مراقبة البريد', en: 'Email Monitoring' }, url: '/admin/email-deliverability', icon: Activity },
      { label: { ar: 'كل المحادثات', en: 'Conversations' }, url: '/dashboard/messages', icon: MessageSquare, superAdminOnly: true },
    ],
  },
  {
    // 7) Content & SEO
    groupLabel: { ar: 'المحتوى والـ SEO', en: 'Content & SEO' },
    icon: Database,
    items: [
      { label: { ar: 'المدونة', en: 'Blog' }, url: '/dashboard/blog', icon: PenSquare },
      { label: { ar: 'التصنيفات', en: 'Categories' }, url: '/admin/categories', icon: FolderTree },
      { label: { ar: 'الوسوم', en: 'Tags' }, url: '/admin/tags', icon: Tags },
      { label: { ar: 'القطاعات', en: 'Sectors' }, url: '/dashboard/profile-systems', icon: Layers },
      { label: { ar: 'القطاعات الخاصة', en: 'Private Sectors' }, url: '/admin/private-sectors', icon: Layers },
      { label: { ar: 'حالة Sitemap', en: 'Sitemap Status' }, url: '/admin/sitemap-status', icon: SearchIcon },
      { label: { ar: 'تدقيق الأداء و SEO', en: 'SEO Performance Audit' }, url: '/admin/site-audit', icon: Gauge },
      { label: { ar: 'سيو القطاعات', en: 'Sector SEO' }, url: '/admin/sector-seo', icon: SearchIcon },
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
      { label: { ar: 'التحليلات والموافقة', en: 'Analytics & Consent' }, url: '/admin/analytics-settings', icon: BarChart3 },
      { label: { ar: 'العلامة التجارية', en: 'Branding' }, url: '/admin/branding', icon: Palette },
      { label: { ar: 'إعدادات API', en: 'API Settings' }, url: '/admin/api-settings', icon: Key },
      { label: { ar: 'توثيق API', en: 'API Documentation' }, url: '/admin/api-docs', icon: Book },
    ],
  },
  {
    // 10) Account (personal)
    groupLabel: { ar: 'الحساب', en: 'Account' },
    icon: User,
    items: [
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
 * /admin/ref/:refId.
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
}> = ({ groups, collapsed, isRTL, closeMobile, isSuperAdmin = false, pathname }) => {
  // Compute best-match across ALL visible items in ALL groups, then
  // pass it down. This prevents two sidebar entries (e.g. "Work Orders"
  // and "Operations Overview") from both highlighting on a nested route.
  const allUrls: string[] = [];
  for (const g of groups) {
    for (const it of g.items) {
      if (it.superAdminOnly && !isSuperAdmin) continue;
      // For `end:true` items we still feed them into the resolver — the
      // longest-prefix rule already gives the correct exact-match winner.
      allUrls.push(it.url);
    }
  }
  const bestActiveUrl = resolveBestMatch(pathname, allUrls);

  return (
  <div className="space-y-1">
    {groups.map((group, gi) => {
      const visibleItems = group.items.filter(item => !item.superAdminOnly || isSuperAdmin);
      if (visibleItems.length === 0) return null;
      return (
        <SidebarGroup key={group.groupLabel.en} className={gi > 0 && !collapsed ? 'mt-1.5 pt-1.5 border-t border-sidebar-border/60' : ''}>
          <SidebarGroupLabel>
            {!collapsed ? (
              <span className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-sidebar-foreground/55">
                <group.icon className="w-3 h-3 opacity-70" />
                {isRTL ? group.groupLabel.ar : group.groupLabel.en}
              </span>
            ) : ''}
          </SidebarGroupLabel>
          {!collapsed && group.description ? (
            <p className="px-2 mb-1 text-[10.5px] text-sidebar-foreground/50 leading-snug">
              {isRTL ? group.description.ar : group.description.en}
            </p>
          ) : null}
          <SidebarGroupContent>
            <RenderMenu
              items={visibleItems}
              collapsed={collapsed}
              isRTL={isRTL}
              closeMobile={closeMobile}
              bestActiveUrl={bestActiveUrl}
            />
          </SidebarGroupContent>
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
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const closeMobile = () => { if (isMobile) setOpenMobile(false); };
  const handleLogout = async () => { await signOut(); navigate('/'); };

  // Admin gets admin-specific base menu, not user/provider menu
  const baseGroups = isAdmin ? adminBaseGroups : (isProvider ? providerGroups : userGroups);

  return (
    <Sidebar collapsible="icon" side={isRTL ? 'right' : 'left'}>
      <SidebarContent>
        {/* Logo */}
        <div className="p-4 sm:p-5 flex items-center gap-3 border-b border-sidebar-border">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-bold text-lg shrink-0 shadow-md shadow-primary/20">
            ق
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <h1 className="font-heading font-bold text-lg leading-none text-sidebar-foreground">قِطاعات</h1>
              <span className="text-[10px] text-accent/80 font-medium tracking-wider">Qitaat</span>
            </div>
          )}
        </div>

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

        {/* ─── Role-based menu ─── */}
        <RenderGroups groups={baseGroups} collapsed={collapsed} isRTL={isRTL} closeMobile={closeMobile} isSuperAdmin={isSuperAdmin} pathname={pathname} />
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
