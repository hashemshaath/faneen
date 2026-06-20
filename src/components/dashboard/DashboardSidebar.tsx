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
import { AdminSidebarFavorites } from '@/components/dashboard/navigation/AdminSidebarFavorites';
import { useAdminFavorites } from '@/hooks/useAdminFavorites';
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
  CheckCircle2,
  Sparkles,
  Plug,
  Award,
  FilePlus2,
  Files,
  FileBarChart,
  Truck,
  Package,
  Pin,
  PinOff,
} from 'lucide-react';
import {
  UNIFIED_GROUP_LABELS,
  CREATE_ENTITY_ROUTE,
  getVisibleDashboardNavGroups,
  providerNavGroups,
  userNavGroups,
  adminNavGroups,
} from '@/modules/dashboard/navigation';

// ══════════════════════════════════════════
//  ADMIN-REDESIGN PHASE 3 — Registry-driven admin sidebar
// ══════════════════════════════════════════
//
// The admin sidebar is derived from the central navigation registry
// (`@/modules/admin-shell`). It exposes 7 canonical groups: Overview,
// Operations, Users & Entities, Content & Directory, System & Governance,
// Analytics and Finance.
//
// Hidden / deep-link-only admin routes (`hiddenInSidebar: true` in the
// registry — reachable from the command palette and direct URLs only):
//   - /admin/users, /admin/users/:id   → superseded by '/admin/identity'
//                                         (Accounts & Approvals hub)
//   - /admin/businesses                → owned by Accounts & Approvals
//   - /admin/quote-requests(/:id)      → opened from Quote Operations
//   - /admin/entity-access-requests    → intentionally hidden; merged
//                                         into Accounts & Approvals at
//                                         '/admin/identity'
//   - /admin/showcase                  → opened from Partner Showcase
//   - /admin/integrations/google       → sub-page of Integrations
//   - /admin/diagnostics               → ops deep link

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
const providerGroups: MenuGroup[] = providerNavGroups;

// ══════════════════════════════════════════
//  المستخدم العادي — User Menu (UNIFIED IA)
//
//  هيكل واحد يطابق المرجع الموحّد:
//    لوحة التحكم → المنشأة → العضوية → التواصل → الحساب
//
//  العناصر المرتبطة بالمنشأة (الفروع/الخدمات/الفريق/الظهور)
//  تُخفى تلقائيًا للمستخدم الذي لا يملك منشأة عبر بطاقة الـ CTA
//  «إنشاء منشأة» → /register-entity (وليس /onboarding).
// ══════════════════════════════════════════
const userGroups: MenuGroup[] = userNavGroups;

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
// ADMIN-REDESIGN PHASE 3 — Sidebar admin groups are derived from the
// central registry in `@/modules/admin-shell` so the sidebar, the
// Cmd+K palette, breadcrumbs, and tests share a single source of
// truth. Items flagged `hiddenInSidebar` remain reachable via direct
// URL and the command palette but are not rendered here.
const adminBaseGroups: MenuGroup[] = adminNavGroups;

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
  pinControl?: {
    isPinned: (url: string) => boolean;
    canPin: (url: string) => boolean;
    toggle: (url: string) => void;
  };
}> = ({ items, collapsed, isRTL, closeMobile, bestActiveUrl, pinControl }) => (
  <SidebarMenu>
    {items.map((item) => {
      const label = isRTL ? item.label.ar : item.label.en;
      const isActive = item.url === bestActiveUrl;
      const badgeLabel = item.badge ? (isRTL ? item.badge.ar : item.badge.en) : null;
      const pinnable = !collapsed && pinControl?.canPin(item.url);
      const pinned = pinnable ? pinControl!.isPinned(item.url) : false;
      return (
        <SidebarMenuItem key={item.url + item.label.en}>
          <SidebarMenuButton
            asChild
            tooltip={collapsed ? label : undefined}
            isActive={isActive}
            className="group/qit-nav h-10 min-h-[40px] rounded-xl px-3 gap-3"
          >
            <NavLink
              to={item.url}
              title={collapsed ? label : undefined}
              aria-label={label}
              aria-current={isActive ? 'page' : undefined}
              className={
                'relative rounded-xl transition-all duration-200 outline-none flex items-center w-full ' +
                'focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-0 ' +
                (isActive
                  ? 'bg-gradient-to-r from-primary/15 to-primary/[0.04] text-primary font-semibold shadow-sm ring-1 ring-primary/20 ' +
                    'dark:from-primary/25 dark:to-primary/5 dark:text-primary-foreground ' +
                    'before:absolute before:inset-y-1.5 before:start-0 before:w-[3px] before:rounded-full before:bg-primary'
                  : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground')
              }
              activeClassName=""
              onClick={closeMobile}
            >
              <item.icon className={
                'h-5 w-5 shrink-0 transition-transform duration-200 group-hover/qit-nav:scale-110 ' +
                (isActive ? 'text-primary' : 'text-muted-foreground group-hover/qit-nav:text-foreground')
              } />
              {!collapsed && <span className="ms-2 truncate text-sm font-medium">{label}</span>}
              {!collapsed && badgeLabel ? <BadgePill tone={item.badge?.tone}>{badgeLabel}</BadgePill> : null}
              {pinnable ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    pinControl!.toggle(item.url);
                  }}
                  aria-label={
                    pinned
                      ? (isRTL ? 'إلغاء التثبيت' : 'Unpin from favorites')
                      : (isRTL ? 'تثبيت في المفضّلة' : 'Pin to favorites')
                  }
                  aria-pressed={pinned}
                  data-testid={`admin-pin-${item.url}`}
                  className={
                    'ms-1 inline-flex h-6 w-6 items-center justify-center rounded-md transition-opacity ' +
                    (pinned
                      ? 'opacity-90 text-primary hover:bg-sidebar-accent/70'
                      : 'opacity-0 group-hover/qit-nav:opacity-70 text-sidebar-foreground/60 hover:text-foreground hover:bg-sidebar-accent/70')
                  }
                >
                  {pinned ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3" />}
                </button>
              ) : null}
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
  pinControl?: {
    isPinned: (url: string) => boolean;
    canPin: (url: string) => boolean;
    toggle: (url: string) => void;
  };
}> = ({ groups, collapsed, isRTL, closeMobile, isSuperAdmin = false, pathname, isAdmin = false, workspace = null, isRouteHidden, pinControl }) => {
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
      // Flatten single-item groups (e.g. Admin → Overview): render as a
      // top-level menu entry without a collapsible header — keeps the
      // sidebar uncluttered when a "group" only contains one route.
      if (visibleItems.length === 1) {
        const only = visibleItems[0];
        const flatItem: MenuItem = {
          ...only,
          label: group.groupLabel,
          icon: group.icon,
        };
        return (
          <SidebarGroup
            key={group.groupLabel.en}
            className={gi > 0 && !collapsed ? 'mt-1.5 pt-1.5 border-t border-sidebar-border/60' : ''}
          >
            <SidebarGroupContent>
              <RenderMenu
                items={[flatItem]}
                collapsed={collapsed}
                isRTL={isRTL}
                closeMobile={closeMobile}
                bestActiveUrl={bestActiveUrl}
                pinControl={pinControl}
              />
            </SidebarGroupContent>
          </SidebarGroup>
        );
      }
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
                className="group/grp w-full flex items-center gap-1.5 px-3 mt-5 mb-2 py-1 rounded-md text-xs font-semibold tracking-wide text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/60 transition-colors"
              >
                <group.icon className="w-3.5 h-3.5 opacity-80 shrink-0" />
                <span className="truncate">{isRTL ? group.groupLabel.ar : group.groupLabel.en}</span>
                <span className="ms-auto inline-flex items-center gap-1 text-[10px] font-normal text-muted-foreground/70">
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
                pinControl={pinControl}
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
  const hasBusiness = (workspace.entities?.length ?? 0) > 0;
  // For non-admin / non-provider users without a business, hide the
  // «المنشأة» group entirely — they get a CTA card instead.
  const baseGroups = getVisibleDashboardNavGroups({
    audience: isAdmin ? 'admin' : isProvider ? 'provider' : 'user',
    hasBusiness,
    isSuperAdmin,
  });

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

  // ADMIN-REDESIGN PHASE 3F — admin-scoped pinned favorites. Disabled
  // (no-op control) for non-admin audiences so the pin button never
  // renders for providers/users.
  const adminFavs = useAdminFavorites({ isSuperAdmin });
  const adminPinControl = isAdmin
    ? {
        isPinned: adminFavs.isFavorite,
        canPin: adminFavs.canPin,
        toggle: adminFavs.toggle,
      }
    : undefined;

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

        {/* ADMIN-REDESIGN PHASE 3F — admin-only pinned section */}
        {isAdmin && (
          <AdminSidebarFavorites
            collapsed={collapsed}
            isRTL={isRTL}
            isSuperAdmin={isSuperAdmin}
            closeMobile={closeMobile}
          />
        )}

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
          pinControl={adminPinControl}
        />

        {/* CTA: «إنشاء منشأة» for users without any business. */}
        {!isAdmin && !isProvider && !hasBusiness && !collapsed && (
          <div className="mx-3 mt-3 mb-2 p-3 rounded-xl border border-primary/25 bg-primary/5">
            <p className="text-[11px] font-semibold text-sidebar-foreground mb-1">
              {isRTL ? 'لديك منشأة؟' : 'Have a business?'}
            </p>
            <p className="text-[10.5px] text-sidebar-foreground/70 leading-snug mb-2">
              {isRTL
                ? 'سجّل منشأتك للوصول إلى أدوات الفريق والخدمات والظهور العام.'
                : 'Register your business to unlock team, services, and public visibility tools.'}
            </p>
            <NavLink
              to={CREATE_ENTITY_ROUTE}
              onClick={closeMobile}
              className="inline-flex items-center justify-center gap-1.5 w-full h-9 rounded-lg bg-primary text-primary-foreground text-[11px] font-semibold hover:bg-primary/90 transition-colors"
            >
              <UserPlus className="h-3.5 w-3.5" />
              {isRTL ? 'إنشاء منشأة' : 'Create business'}
            </NavLink>
          </div>
        )}
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
