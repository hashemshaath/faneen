/**
 * AdminIdentity — Identity & Entities statistics hub.
 *
 * Pure overview surface: combined KPIs, charts, recent activity, unified
 * ⌘K search, and a single navigation grid that routes admins to the
 * dedicated management pages — never embeds them. This keeps the page
 * fast, focused, and easy to scan.
 *
 * Dedicated management destinations:
 *  - Users (CRUD, ban, roles, password, bulk)   → /admin/users
 *  - Businesses (CRUD, verify, tiers, branches) → /admin/businesses
 *  - Provider approval review                   → /admin/provider-review
 *  - Access requests                            → /admin/entity-access-requests
 *  - Access management & RLS roles              → /admin/access-management
 *  - Memberships, payments, events              → /admin/memberships*
 *
 * Legacy `?view=users|businesses|provider-review|access-requests|access-management`
 * deep-links are redirected to the standalone routes so existing sidebar
 * shortcuts and bookmarks keep working.
 */
import React, { useState, useMemo, useEffect, useRef, useTransition, useCallback } from 'react';
import { Link, useSearchParams, Navigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useNoIndex } from '@/hooks/useNoIndex';
import { usePageMeta } from '@/hooks/usePageMeta';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ReferenceBadge } from '@/components/reference/ReferenceBadge';
import { DirectionalIcon } from '@/components/ui/directional-icon';
import { EntityLink } from '@/components/admin/identity/EntityLink';
import { IdentityCommandPalette } from '@/components/admin/identity/IdentityCommandPalette';
import { IdentityActivityFeed } from '@/components/admin/identity/IdentityActivityFeed';
import { IdentitySignupsChart } from '@/components/admin/identity/IdentitySignupsChart';
import { ApprovalsInbox } from '@/pages/admin/approvalsCenter/ApprovalsInbox';
import { AdminActivityLog } from '@/pages/admin/approvalsCenter/AdminActivityLog';
import { useUnifiedApprovalsCounts } from '@/components/admin/useUnifiedApprovalsCounts';
import { listProfiles } from '@/modules/users';
import { listAllUserRoles } from '@/modules/identity';
import { listAdminBusinesses } from '@/modules/businesses';
import { maskEmail, maskPhone } from '@/lib/masking';
import type { Tables } from '@/integrations/supabase/types';
import {
  Users, Building2, Search, Command, Shield, Crown, ShieldCheck, Briefcase,
  TrendingUp, UserCheck, Ban, CheckCircle2, Sparkles, Plus,
  UserPlus, Activity, ExternalLink, KeyRound, BarChart3,
  RefreshCw, Stethoscope, MapPin, ArrowUpRight, LayoutDashboard, Inbox, FileText,
} from 'lucide-react';

/**
 * Legacy `?view=...` deep-links → standalone management routes.
 * Keys here forward to dedicated pages; unknown / hub-native keys
 * (`overview`, `integrity`, `activity`) intentionally fall through
 * and render the Account Center hub.
 */
const VIEW_REDIRECTS: Record<string, string> = {
  users:              '/admin/users',
  businesses:         '/admin/businesses',
  'provider-review':  '/admin/provider-review',
  'access-requests':  '/admin/entity-access-requests',
  'access-management':'/admin/access-management',
  memberships:        '/admin/memberships',
  analytics:          '/admin/provider-analytics',
  locations:          '/admin/locations',
};

type Profile = Tables<'profiles'>;
type UserRole = Tables<'user_roles'>;

interface BizRow {
  id: string;
  user_id: string;
  name_ar: string;
  name_en: string | null;
  ref_id: string;
  username: string | null;
  is_active: boolean;
  is_verified: boolean;
  approval_status: string | null;
  membership_tier: string;
  created_at: string;
}

/* ─── KPI card — Fluent/industrial cleaner look ─── */
const Kpi: React.FC<{
  icon: React.ElementType; label: string; value: number | string;
  tone: 'primary' | 'success' | 'info' | 'warning' | 'accent';
  to?: string; hint?: string; trend?: string;
}> = ({ icon: Icon, label, value, tone, to, hint, trend }) => {
  const toneCfg = {
    primary: { text: 'text-primary',  bg: 'bg-primary/10',  ring: 'ring-primary/20',  grad: 'from-primary/15 via-primary/5 to-transparent',  glow: 'group-hover/kpi:shadow-[0_8px_30px_-12px_hsl(var(--primary)/0.35)]' },
    success: { text: 'text-success',  bg: 'bg-success/10',  ring: 'ring-success/20',  grad: 'from-success/15 via-success/5 to-transparent',  glow: 'group-hover/kpi:shadow-[0_8px_30px_-12px_hsl(var(--success)/0.35)]' },
    info:    { text: 'text-info',     bg: 'bg-info/10',     ring: 'ring-info/20',     grad: 'from-info/15 via-info/5 to-transparent',        glow: 'group-hover/kpi:shadow-[0_8px_30px_-12px_hsl(var(--info)/0.35)]' },
    warning: { text: 'text-warning',  bg: 'bg-warning/10',  ring: 'ring-warning/20',  grad: 'from-warning/15 via-warning/5 to-transparent',  glow: 'group-hover/kpi:shadow-[0_8px_30px_-12px_hsl(var(--warning)/0.35)]' },
    accent:  { text: 'text-accent',   bg: 'bg-accent/10',   ring: 'ring-accent/20',   grad: 'from-accent/15 via-accent/5 to-transparent',    glow: 'group-hover/kpi:shadow-[0_8px_30px_-12px_hsl(var(--accent)/0.35)]' },
  } as const;
  const t = toneCfg[tone];
  const body = (
    <div className={`group/kpi relative h-full overflow-hidden rounded-2xl border border-border/50 bg-card p-4 sm:p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-border ${t.glow}`}>
      {/* decorative tone gradient */}
      <div className={`pointer-events-none absolute -top-12 -end-12 h-32 w-32 rounded-full bg-gradient-to-br ${t.grad} blur-2xl opacity-70`} />
      <div className="relative flex items-center justify-between gap-2">
        <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">{label}</p>
        <span className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${t.bg} ${t.text} ring-1 ${t.ring} shrink-0 transition-transform duration-300 group-hover/kpi:scale-110 group-hover/kpi:rotate-3`}>
          <Icon className="w-4 h-4" />
        </span>
      </div>
      <div className="relative flex items-end justify-between gap-2 mt-3">
        <h3 className="text-2xl sm:text-3xl font-bold font-heading leading-none tech-content tabular-nums text-foreground">{value}</h3>
        {trend && (
          <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-2 py-1 rounded-full ${t.bg} ${t.text} ring-1 ${t.ring} shrink-0`}>
            <TrendingUp className="w-2.5 h-2.5" />
            {trend}
          </span>
        )}
      </div>
      {hint && <p className="relative text-[10px] text-muted-foreground mt-2 truncate">{hint}</p>}
      {to && <DirectionalIcon kind="forward" className="absolute top-3 w-3 h-3 text-muted-foreground/40 opacity-0 group-hover/kpi:opacity-100 transition-opacity" style={{ insetInlineEnd: '0.75rem' }} />}
    </div>
  );
  return to ? <Link to={to} className="block h-full">{body}</Link> : body;
};

/* ─── Tier color helper ─── */
const tierBadge = (tier: string, isRTL: boolean) => {
  const map: Record<string, { ar: string; en: string; cls: string }> = {
    free:       { ar: 'مجاني',   en: 'Free',       cls: 'bg-muted text-muted-foreground border-border' },
    basic:      { ar: 'أساسي',   en: 'Basic',      cls: 'bg-info/10 text-info border-info/30' },
    premium:    { ar: 'مميز',    en: 'Premium',    cls: 'bg-accent/10 text-accent border-accent/30' },
    enterprise: { ar: 'مؤسسات',  en: 'Enterprise', cls: 'bg-secondary/10 text-secondary border-secondary/30' },
  };
  const cfg = map[tier] ?? map.free;
  return <Badge variant="outline" className={`text-[10px] border px-1.5 py-0 ${cfg.cls}`}>{isRTL ? cfg.ar : cfg.en}</Badge>;
};

const AdminIdentity: React.FC = () => {
  useNoIndex();
  const { isRTL } = useLanguage();
  usePageMeta({
    title: isRTL ? 'مركز الحسابات والموافقات | إدارة قِطاعات' : 'Accounts & Approvals | Qitaat Admin',
    noindex: true,
  });
  const { isSuperAdmin } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [, startTransition] = useTransition();
  const queryClient = useQueryClient();

  // Tabs: overview | workspace (merged approvals+directory) | audit
  type TabKey = 'overview' | 'workspace' | 'audit';
  // Legacy keys ('approvals', 'directory') redirect to the unified workspace.
  const rawTab = searchParams.get('tab');
  const initialTab: TabKey =
    rawTab === 'overview' || rawTab === 'audit' ? rawTab
    : rawTab === 'workspace' || rawTab === 'approvals' || rawTab === 'directory' ? 'workspace'
    : 'overview';
  const [tab, setTab] = useState<TabKey>(initialTab);
  const setTabSafe = useCallback((next: TabKey) => {
    setTab(next);
    const sp = new URLSearchParams(searchParams);
    if (next === 'overview') sp.delete('tab'); else sp.set('tab', next);
    setSearchParams(sp, { replace: true });
  }, [searchParams, setSearchParams]);

  const { data: approvalsCounts } = useUnifiedApprovalsCounts();
  const pendingTotal =
    (approvalsCounts?.approvalsPending ?? 0) +
    (approvalsCounts?.businessesPending ?? 0) +
    (approvalsCounts?.accessPending ?? 0);

  // Legacy ?view=... deep-link redirect to standalone management pages.
  const legacyView = searchParams.get('view');
  const redirectTo = legacyView ? VIEW_REDIRECTS[legacyView] : null;

  const refreshAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['identity-profiles'] });
    queryClient.invalidateQueries({ queryKey: ['identity-roles'] });
    queryClient.invalidateQueries({ queryKey: ['identity-businesses'] });
    queryClient.invalidateQueries({ queryKey: ['identity-activity'] });
  }, [queryClient]);

  const [searchTerm, setSearchTerm] = useState('');
  const [deferredSearch, setDeferredSearch] = useState('');
  const searchRef = useRef<HTMLInputElement | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);

  // Per-tab persisted search — survives navigation & reload.
  const tabSearchKey = `qitaat_admin_identity_search_${tab}`;
  useEffect(() => {
    try {
      const v = localStorage.getItem(tabSearchKey) ?? '';
      setSearchTerm(v);
      setDeferredSearch(v);
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const handleSearchChange = useCallback((val: string) => {
    setSearchTerm(val);
    try { localStorage.setItem(tabSearchKey, val); } catch { /* ignore */ }
    startTransition(() => setDeferredSearch(val));
  }, [tabSearchKey]);

  // ⌘K command palette
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  /* ─── Data queries ─── */
  const { data: profiles = [], isLoading: loadingProfiles } = useQuery({
    queryKey: ['identity-profiles'],
    queryFn: async () => {
      const { data, error } = await listProfiles<Profile>({
        select:
          'id, user_id, ref_id, full_name, email, phone, avatar_url, account_type, membership_tier, is_banned, is_onboarded, phone_verified, created_at, updated_at',
        orderBy: { column: 'created_at', ascending: false },
      });
      if (error) throw error;
      return (data ?? []) as Profile[];
    },
    enabled: !redirectTo,
    staleTime: 2 * 60_000,
  });

  const { data: roles = [] } = useQuery({
    queryKey: ['identity-roles'],
    queryFn: () => listAllUserRoles() as Promise<UserRole[]>,
    enabled: !redirectTo,
    staleTime: 5 * 60_000,
  });

  const { data: businesses = [], isLoading: loadingBiz } = useQuery({
    queryKey: ['identity-businesses'],
    queryFn: async () => {
      const { data, error } = await listAdminBusinesses<BizRow>({
        select:
          'id, user_id, name_ar, name_en, ref_id, username, is_active, is_verified, approval_status, membership_tier, created_at',
      });
      if (error) throw error;
      return (data ?? []) as BizRow[];
    },
    enabled: !redirectTo,
    staleTime: 2 * 60_000,
  });

  /* ─── Derived maps ─── */
  const rolesByUser = useMemo(() => {
    const m = new Map<string, UserRole[]>();
    roles.forEach((r) => {
      const arr = m.get(r.user_id) || [];
      arr.push(r);
      m.set(r.user_id, arr);
    });
    return m;
  }, [roles]);

  const bizsByOwner = useMemo(() => {
    const m = new Map<string, BizRow[]>();
    businesses.forEach((b) => {
      const arr = m.get(b.user_id) || [];
      arr.push(b);
      m.set(b.user_id, arr);
    });
    return m;
  }, [businesses]);

  const profileByUserId = useMemo(() => {
    const m = new Map<string, Profile>();
    profiles.forEach((p) => m.set(p.user_id, p));
    return m;
  }, [profiles]);

  /* ─── KPIs ─── */
  const kpis = useMemo(() => {
    const now = Date.now();
    const weekAgo = now - 7 * 86400000;
    return {
      totalUsers: profiles.length,
      totalBusinesses: businesses.length,
      providers: profiles.filter((p) => p.account_type === 'business' || p.account_type === 'company').length,
      verifiedBiz: businesses.filter((b) => b.is_verified).length,
      pendingBiz: businesses.filter((b) => b.approval_status === 'pending' || b.approval_status === 'submitted' || b.approval_status === 'under_review').length,
      bannedUsers: profiles.filter((p) => p.is_banned).length,
      staffCount: new Set(
        roles
          .filter((r) => r.role === 'super_admin' || r.role === 'admin' || r.role === 'moderator')
          .map((r) => r.user_id),
      ).size,
      newUsers7d: profiles.filter((p) => new Date(p.created_at).getTime() > weekAgo).length,
      newBiz7d: businesses.filter((b) => new Date(b.created_at).getTime() > weekAgo).length,
    };
  }, [profiles, businesses, roles]);

  /* ─── Unified search ─── */
  const searchResults = useMemo(() => {
    if (!deferredSearch || deferredSearch.length < 2) return null;
    const q = deferredSearch.toLowerCase().trim();
    const userMatches = profiles.filter((p) =>
      p.full_name?.toLowerCase().includes(q) ||
      p.email?.toLowerCase().includes(q) ||
      p.phone?.includes(deferredSearch) ||
      p.ref_id?.toLowerCase().includes(q),
    ).slice(0, 8);
    const bizMatches = businesses.filter((b) =>
      b.name_ar?.toLowerCase().includes(q) ||
      b.name_en?.toLowerCase().includes(q) ||
      b.ref_id?.toLowerCase().includes(q) ||
      b.username?.toLowerCase().includes(q),
    ).slice(0, 8);
    return { users: userMatches, businesses: bizMatches };
  }, [deferredSearch, profiles, businesses]);

  const isLoading = loadingProfiles || loadingBiz;

  const recentUsers = useMemo(() => profiles.slice(0, 6), [profiles]);
  const recentBusinesses = useMemo(
    () => [...businesses].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 6),
    [businesses],
  );

  /* ─── Redirect legacy deep-links ─── */
  if (redirectTo) {
    const sp = new URLSearchParams(searchParams);
    sp.delete('view');
    const qs = sp.toString();
    return <Navigate to={qs ? `${redirectTo}?${qs}` : redirectTo} replace />;
  }

  /* ─── Management surfaces (navigation grid) ─── */
  const managementSurfaces: Array<{
    to: string; icon: React.ElementType; ar: string; en: string;
    desc_ar: string; desc_en: string; count?: number; tone: 'info' | 'success' | 'warning' | 'accent' | 'primary';
  }> = [
    { to: '/admin/users', icon: Users, ar: 'المستخدمون', en: 'Users',
      desc_ar: 'إدارة الحسابات، الأدوار، الحظر، كلمات المرور', desc_en: 'Accounts, roles, ban, passwords',
      count: kpis.totalUsers, tone: 'info' },
    { to: '/admin/businesses', icon: Building2, ar: 'المنشآت والكيانات', en: 'Businesses & Entities',
      desc_ar: 'الملفات، التوثيق، الفروع، الخدمات', desc_en: 'Profiles, verification, branches, services',
      count: kpis.totalBusinesses, tone: 'success' },
    { to: '/admin/provider-review', icon: ShieldCheck, ar: 'مراجعة المزودين', en: 'Provider Review',
      desc_ar: 'موافقة، طلب تعديلات، نشر', desc_en: 'Approve, request changes, publish',
      count: kpis.pendingBiz, tone: 'warning' },
    { to: '/admin/entity-access-requests', icon: KeyRound, ar: 'طلبات الانضمام', en: 'Access Requests',
      desc_ar: 'انضمام المستخدمين للمنشآت', desc_en: 'Users joining businesses', tone: 'accent' },
    { to: '/admin/access-management', icon: Shield, ar: 'إدارة الوصول', en: 'Access Management',
      desc_ar: 'الأدوار، الصلاحيات، RLS', desc_en: 'Roles, permissions, RLS', tone: 'primary' },
    { to: '/admin/memberships', icon: Crown, ar: 'العضويات', en: 'Memberships',
      desc_ar: 'الباقات، المدفوعات، الأحداث', desc_en: 'Tiers, payments, events', tone: 'accent' },
    { to: '/admin/provider-analytics', icon: TrendingUp, ar: 'تحليلات المزودين', en: 'Provider Analytics',
      desc_ar: 'الأداء، التحويل، المؤشرات', desc_en: 'Performance, conversion, KPIs', tone: 'info' },
    { to: '/admin/locations', icon: MapPin, ar: 'مركز المواقع', en: 'Locations Center',
      desc_ar: 'الكتالوج، مناطق الخدمة، الإحداثيات', desc_en: 'Catalog, service areas, coordinates', tone: 'success' },
  ];

  const toneRing: Record<string, string> = {
    info:    'hover:border-info/60 hover:shadow-[0_10px_30px_-15px_hsl(var(--info)/0.4)]',
    success: 'hover:border-success/60 hover:shadow-[0_10px_30px_-15px_hsl(var(--success)/0.4)]',
    warning: 'hover:border-warning/60 hover:shadow-[0_10px_30px_-15px_hsl(var(--warning)/0.4)]',
    accent:  'hover:border-accent/60 hover:shadow-[0_10px_30px_-15px_hsl(var(--accent)/0.4)]',
    primary: 'hover:border-primary/60 hover:shadow-[0_10px_30px_-15px_hsl(var(--primary)/0.4)]',
  };
  const toneText: Record<string, string> = {
    info: 'text-info', success: 'text-success', warning: 'text-warning', accent: 'text-accent', primary: 'text-primary',
  };
  const toneBg: Record<string, string> = {
    info: 'bg-info/10 ring-info/20', success: 'bg-success/10 ring-success/20',
    warning: 'bg-warning/10 ring-warning/20', accent: 'bg-accent/10 ring-accent/20',
    primary: 'bg-primary/10 ring-primary/20',
  };
  const toneGrad: Record<string, string> = {
    info: 'from-info/10 to-transparent', success: 'from-success/10 to-transparent',
    warning: 'from-warning/10 to-transparent', accent: 'from-accent/10 to-transparent',
    primary: 'from-primary/10 to-transparent',
  };

  return (
    <DashboardLayout>
      <div className="mx-auto w-full max-w-7xl space-y-6 md:space-y-8 pb-12 px-1 sm:px-0">
        {/* ─── Hero header — premium gradient banner with primary actions ─── */}
        <section
          aria-label={isRTL ? 'مركز الحسابات' : 'Accounts hub'}
          className="relative overflow-hidden rounded-3xl border border-border/50 bg-gradient-to-br from-card via-card to-muted/40 p-5 md:p-7 shadow-[var(--elev-1)]"
        >
          {/* decorative blobs */}
          <div className="pointer-events-none absolute -top-24 -end-24 h-64 w-64 rounded-full bg-gradient-to-br from-primary/20 via-accent/10 to-transparent blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -start-24 h-64 w-64 rounded-full bg-gradient-to-tr from-info/15 via-success/5 to-transparent blur-3xl" />

          <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-4 min-w-0">
              <div className="relative shrink-0">
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary to-accent blur-md opacity-50" aria-hidden />
                <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary via-primary to-accent text-white shadow-lg ring-1 ring-white/10">
                  <Users className="h-6 w-6" />
                </div>
              </div>
              <div className="min-w-0">
                <p className="text-[10px] md:text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground/80 mb-1">
                  {isRTL ? 'لوحة الإدارة' : 'Admin'}
                </p>
                <h1 className="text-xl md:text-3xl font-bold font-heading leading-tight bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
                  {isRTL ? 'مركز الحسابات والموافقات' : 'Accounts & Approvals'}
                </h1>
                <p className="text-xs md:text-sm text-muted-foreground mt-1.5 leading-relaxed line-clamp-2 max-w-prose">
                  {isRTL
                    ? 'سطح موحّد للحسابات والمنشآت والموافقات — نظرة عامة، صندوق، ودليل.'
                    : 'Unified surface for accounts, businesses, and approvals — overview, inbox, and directory.'}
                </p>
                {/* inline mini-stats */}
                {!isLoading && (
                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px]">
                    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                      <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
                      {isRTL ? `${kpis.totalUsers.toLocaleString('ar-SA')} حساب` : `${kpis.totalUsers.toLocaleString()} accounts`}
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                      <Building2 className="w-3 h-3 text-success" />
                      {isRTL ? `${kpis.totalBusinesses.toLocaleString('ar-SA')} منشأة` : `${kpis.totalBusinesses.toLocaleString()} businesses`}
                    </span>
                    {pendingTotal > 0 && (
                      <Link to="/admin/identity?tab=workspace" onClick={() => setTabSafe('workspace')}
                        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-warning/10 text-warning font-semibold ring-1 ring-warning/30 hover:bg-warning/20 transition-colors">
                        <Inbox className="w-3 h-3" />
                        {isRTL ? `${pendingTotal} بانتظار المراجعة` : `${pendingTotal} pending review`}
                      </Link>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap md:flex-nowrap shrink-0">
            <Button
              type="button" variant="outline" size="sm" className="rounded-xl gap-1.5 h-10"
              onClick={refreshAll} disabled={isLoading}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{isRTL ? 'تحديث' : 'Refresh'}</span>
            </Button>
            {isSuperAdmin && (
              <>
                <Button asChild variant="outline" size="sm" className="rounded-xl gap-1.5 h-10">
                  <Link to="/admin/users?create=individual">
                    <UserPlus className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{isRTL ? 'مستخدم' : 'User'}</span>
                  </Link>
                </Button>
                <Button asChild size="sm" className="rounded-xl gap-1.5 h-10 bg-gradient-to-br from-primary to-accent text-white shadow-md hover:shadow-lg hover:opacity-95 transition-all">
                  <Link to="/admin/businesses">
                    <Plus className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{isRTL ? 'منشأة' : 'Business'}</span>
                  </Link>
                </Button>
              </>
            )}
            </div>
          </div>
        </section>

        {/* ─── Unified Command Search — always visible, hero-style ─── */}
        <div className="relative group/search">
          <div className="pointer-events-none absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-primary/40 via-accent/30 to-info/40 opacity-0 blur-md group-focus-within/search:opacity-60 transition-opacity duration-500" aria-hidden />
          <Search className="absolute top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5 z-10" style={{ insetInlineStart: '16px' }} />
          <Input
            ref={searchRef}
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder={
              tab === 'audit'
                ? (isRTL ? 'بحث في السجل: مسؤول، إجراء، كيان…' : 'Search audit: actor, action, entity…')
                : (isRTL ? 'بحث موحّد: اسم المنشأة، البريد، الهاتف، USR-… أو BIZ-…' : 'Unified: business name, email, phone, USR-… or BIZ-…')
            }
            className="relative ps-12 pe-24 h-14 rounded-2xl bg-card border-border/60 shadow-sm focus-visible:ring-2 focus-visible:ring-primary/30 text-sm md:text-base"
            dir="auto"
            onFocus={() => { if (tab === 'overview') setTabSafe('workspace'); }}
          />
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="hidden sm:inline-flex absolute top-1/2 -translate-y-1/2 z-10 items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border/50 bg-muted/60 hover:bg-muted hover:border-primary/40 text-[10px] text-muted-foreground hover:text-foreground font-mono transition-all"
            style={{ insetInlineEnd: '14px' }}
            aria-label={isRTL ? 'فتح لوحة الأوامر' : 'Open command palette'}
          >
            <Command className="w-3 h-3" />K
          </button>
        </div>

        {/* ─── Sticky Tab strip — segmented pills, mobile scrollable ─── */}
        <div className="sticky top-0 z-20 -mx-1 sm:mx-0 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70 py-2">
          <div
            className="inline-flex w-full md:w-auto items-center gap-1 p-1 rounded-2xl bg-muted/50 border border-border/40 overflow-x-auto no-scrollbar"
            role="tablist"
            aria-label={isRTL ? 'أقسام المركز' : 'Center sections'}
          >
            {([
              { key: 'overview',  ar: 'نظرة عامة',  en: 'Overview',  icon: LayoutDashboard },
              { key: 'workspace', ar: 'سطح العمل', en: 'Workspace', icon: Inbox, badge: pendingTotal },
              { key: 'audit',     ar: 'السجل',     en: 'Audit',     icon: FileText },
            ] as Array<{ key: TabKey; ar: string; en: string; icon: React.ElementType; badge?: number }>).map((t) => {
              const active = tab === t.key;
              const Icon = t.icon;
              return (
                <button
                  key={t.key}
                  role="tab"
                  aria-selected={active}
                  onClick={() => setTabSafe(t.key)}
                  className={`relative inline-flex items-center gap-2 px-3.5 md:px-5 min-h-[42px] rounded-xl text-xs md:text-sm font-semibold transition-all duration-300 whitespace-nowrap ${
                    active
                      ? 'bg-gradient-to-br from-card to-card/80 text-foreground shadow-md border border-border/60 ring-1 ring-primary/10'
                      : 'bg-transparent text-muted-foreground hover:text-foreground hover:bg-card/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 transition-colors ${active ? 'text-primary' : ''}`} />
                  <span>{isRTL ? t.ar : t.en}</span>
                  {typeof t.badge === 'number' && t.badge > 0 && (
                    <span className="tech-content rounded-full px-2 py-0.5 text-[10px] bg-warning text-warning-foreground font-bold tabular-nums shadow-sm animate-in zoom-in duration-300">
                      {t.badge}
                    </span>
                  )}
                  {active && (
                    <span className="absolute -bottom-1 start-1/2 -translate-x-1/2 h-1 w-8 rounded-full bg-gradient-to-r from-primary to-accent" aria-hidden />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {tab === 'audit' && (
          <div className="pt-2">
            <AdminActivityLog externalSearch={deferredSearch} />
          </div>
        )}

        {/* ─── Workspace: live directory results + approvals inbox stacked ─── */}
        {tab === 'workspace' && searchResults && (
          <div className="rounded-2xl border border-accent/30 bg-accent/5 p-4 animate-in slide-in-from-top-1 duration-200">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold text-muted-foreground">
                {isRTL ? 'نتائج الدليل (مستخدمون ومنشآت)' : 'Directory results (users & businesses)'}
              </p>
              <button onClick={() => handleSearchChange('')} className="text-[11px] text-muted-foreground hover:text-foreground">
                {isRTL ? 'مسح' : 'Clear'}
              </button>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-[11px] font-bold text-info mb-2 flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {isRTL ? `المستخدمون (${searchResults.users.length})` : `Users (${searchResults.users.length})`}
                </p>
                <div className="space-y-1">
                  {searchResults.users.length === 0 && (
                    <p className="text-[11px] text-muted-foreground italic">{isRTL ? 'لا توجد نتائج' : 'No matches'}</p>
                  )}
                  {searchResults.users.map((p) => (
                    <Link key={p.id} to={`/admin/users?focus=${p.user_id}`}
                      className="flex items-center gap-2 rounded-lg bg-card border border-border/30 px-2 py-1.5 hover:border-info/40 hover-lift">
                      <Avatar className="w-6 h-6">
                        <AvatarImage src={p.avatar_url || undefined} />
                        <AvatarFallback className="text-[10px]">{(p.full_name || '?').charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{p.full_name || (isRTL ? 'بدون اسم' : 'No name')}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{isSuperAdmin ? p.email : maskEmail(p.email || '')}</p>
                      </div>
                      {p.ref_id && <ReferenceBadge refId={p.ref_id} />}
                    </Link>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[11px] font-bold text-success mb-2 flex items-center gap-1">
                  <Building2 className="w-3 h-3" />
                  {isRTL ? `المنشآت (${searchResults.businesses.length})` : `Businesses (${searchResults.businesses.length})`}
                </p>
                <div className="space-y-1">
                  {searchResults.businesses.length === 0 && (
                    <p className="text-[11px] text-muted-foreground italic">{isRTL ? 'لا توجد نتائج' : 'No matches'}</p>
                  )}
                  {searchResults.businesses.map((b) => (
                    <Link key={b.id} to={`/admin/businesses?focus=${b.id}`}
                      className="flex items-center gap-2 rounded-lg bg-card border border-border/30 px-2 py-1.5 hover:border-success/40 hover-lift">
                      <Building2 className="w-4 h-4 text-success shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{isRTL ? b.name_ar : (b.name_en || b.name_ar)}</p>
                        <p className="text-[10px] text-muted-foreground truncate">@{b.username || '—'}</p>
                      </div>
                      {b.is_verified && <CheckCircle2 className="w-3 h-3 text-success" />}
                      <ReferenceBadge refId={b.ref_id} />
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === 'workspace' && (
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-heading font-bold text-sm flex items-center gap-2">
                <Inbox className="w-4 h-4 text-warning" />
                {isRTL ? 'صندوق الموافقات' : 'Approvals inbox'}
                {pendingTotal > 0 && (
                  <Badge className="bg-warning/15 text-warning border-warning/30 text-[10px] px-1.5 py-0">
                    {pendingTotal}
                  </Badge>
                )}
              </h2>
              <p className="text-[11px] text-muted-foreground hidden sm:block">
                {isRTL ? 'الفلاتر، التحديد المتعدد، وتغيير الحالة — كلها في الأسفل' : 'Filters, multi-select, and status changes below'}
              </p>
            </div>
            <ApprovalsInbox externalSearch={deferredSearch} />
          </div>
        )}

        {tab === 'overview' && (<>
        {/* ─── Hero KPIs (primary) ─── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <Kpi icon={Users} label={isRTL ? 'إجمالي الحسابات' : 'Total accounts'}
               value={isLoading ? '…' : kpis.totalUsers} tone="primary" to="/admin/users"
               trend={kpis.newUsers7d > 0 ? `+${kpis.newUsers7d}` : undefined}
               hint={isRTL ? 'هذا الأسبوع' : 'this week'} />
          <Kpi icon={Building2} label={isRTL ? 'المنشآت المسجّلة' : 'Registered businesses'}
               value={isLoading ? '…' : kpis.totalBusinesses} tone="success" to="/admin/businesses"
               trend={kpis.newBiz7d > 0 ? `+${kpis.newBiz7d}` : undefined}
               hint={isRTL ? 'هذا الأسبوع' : 'this week'} />
          <Kpi icon={Sparkles} label={isRTL ? 'بانتظار المراجعة' : 'Pending review'}
               value={isLoading ? '…' : kpis.pendingBiz} tone="warning" to="/admin/provider-review"
               trend={kpis.pendingBiz > 0 ? (isRTL ? 'عاجل' : 'urgent') : undefined} />
          <Kpi icon={CheckCircle2} label={isRTL ? 'منشآت موثّقة' : 'Verified'}
               value={isLoading ? '…' : kpis.verifiedBiz} tone="accent" to="/admin/businesses" />
        </div>
        {/* ─── Secondary KPIs (compact) ─── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <Kpi icon={UserCheck} label={isRTL ? 'مزودو الخدمات' : 'Service providers'}
               value={isLoading ? '…' : kpis.providers} tone="info" to="/admin/users?type=business" />
          <Kpi icon={Crown} label={isRTL ? 'فريق الإدارة' : 'Admin staff'}
               value={isLoading ? '…' : kpis.staffCount} tone="warning" to="/admin/users?role=admin" />
          <Kpi icon={Ban} label={isRTL ? 'حسابات معطّلة' : 'Disabled accounts'}
               value={isLoading ? '…' : kpis.bannedUsers} tone="warning" to="/admin/users?tab=disabled" />
          <Kpi icon={Shield} label={isRTL ? 'إجمالي الأدوار' : 'Role grants'}
               value={isLoading ? '…' : roles.length} tone="info" to="/admin/access-management" />
        </div>

        {/* ─── Management navigation grid ─── */}
        <section aria-labelledby="mgmt-heading" className="relative overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-br from-card via-card to-muted/20 p-5 md:p-6">
          <div className="pointer-events-none absolute -top-20 -end-20 h-48 w-48 rounded-full bg-gradient-to-br from-accent/15 to-transparent blur-3xl" />
          <div className="relative flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-accent/10 text-accent ring-1 ring-accent/20">
                <Sparkles className="w-4 h-4" />
              </span>
              <div>
                <h2 id="mgmt-heading" className="font-heading font-bold text-sm md:text-base">
                  {isRTL ? 'الإدارة التفصيلية' : 'Detailed management'}
                </h2>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {isRTL ? 'صفحات مستقلّة لكل جانب من جوانب الإدارة' : 'Dedicated page per surface'}
                </p>
              </div>
            </div>
            <Badge variant="outline" className="text-[10px] tabular-nums hidden sm:inline-flex">
              {managementSurfaces.length} {isRTL ? 'سطح' : 'surfaces'}
            </Badge>
          </div>
          <div className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {managementSurfaces.map((s) => (
              <Link
                key={s.to}
                to={s.to}
                className={`group relative overflow-hidden rounded-2xl border border-border/40 bg-card/80 backdrop-blur p-4 transition-all duration-300 hover:-translate-y-0.5 ${toneRing[s.tone]}`}
              >
                <div className={`pointer-events-none absolute -top-10 -end-10 h-24 w-24 rounded-full bg-gradient-to-br ${toneGrad[s.tone]} blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                <div className="relative flex items-start justify-between gap-2">
                  <span className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl ${toneBg[s.tone]} ${toneText[s.tone]} ring-1 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3`}>
                    <s.icon className="w-5 h-5" />
                  </span>
                  <div className="flex items-center gap-1.5 ms-auto">
                    {typeof s.count === 'number' && !isLoading && (
                      <Badge variant="outline" className={`tech-content text-[10px] tabular-nums font-bold ${toneText[s.tone]} border-current/30`}>
                        {s.count.toLocaleString(isRTL ? 'ar-SA' : 'en-US')}
                      </Badge>
                    )}
                    <ArrowUpRight className={`w-4 h-4 text-muted-foreground/40 transition-all duration-300 group-hover:text-foreground group-hover:translate-x-0.5 group-hover:-translate-y-0.5 ${isRTL ? 'rtl-flip' : ''}`} />
                  </div>
                </div>
                <p className="relative mt-3 font-heading text-sm md:text-[15px] font-bold leading-tight text-foreground">
                  {isRTL ? s.ar : s.en}
                </p>
                <p className="relative mt-1 text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
                  {isRTL ? s.desc_ar : s.desc_en}
                </p>
              </Link>
            ))}
          </div>
        </section>

        {/* ─── Insights: signups + activity ─── */}
        <div className="grid lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <IdentitySignupsChart profiles={profiles} businesses={businesses} isRTL={isRTL} days={30} />
          </div>
          <IdentityActivityFeed isRTL={isRTL} limit={15} />
        </div>

        {/* ─── Recent users + recent businesses ─── */}
        <div className="grid lg:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-border/30 bg-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading font-bold text-sm flex items-center gap-2">
                <Users className="w-4 h-4 text-info" />
                {isRTL ? 'أحدث المستخدمين' : 'Recent users'}
              </h3>
              <Button asChild variant="ghost" size="sm" className="text-[11px] h-7">
                <Link to="/admin/users">{isRTL ? 'الكل' : 'All'} <DirectionalIcon kind="forward" className="w-3 h-3 ms-1" /></Link>
              </Button>
            </div>
            {isLoading ? (
              <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)}</div>
            ) : (
              <div className="space-y-2">
                {recentUsers.map((p) => {
                  const userBizs = bizsByOwner.get(p.user_id) || [];
                  const userRoles = rolesByUser.get(p.user_id) || [];
                  const isStaff = userRoles.some((r) => ['super_admin', 'admin', 'moderator'].includes(r.role));
                  return (
                    <Link key={p.id} to={`/admin/users?focus=${p.user_id}`}
                      className="flex items-center gap-3 rounded-xl bg-muted/20 hover:bg-muted/40 border border-transparent hover:border-border/40 p-2.5 transition-all hover-lift">
                      <Avatar className="w-9 h-9">
                        <AvatarImage src={p.avatar_url || undefined} />
                        <AvatarFallback>{(p.full_name || '?').charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold truncate">{p.full_name || (isRTL ? 'بدون اسم' : 'No name')}</p>
                          {p.ref_id && <ReferenceBadge refId={p.ref_id} />}
                          {isStaff && <Badge className="bg-warning/10 text-warning border-warning/30 text-[9px] px-1.5 py-0">{isRTL ? 'إدارة' : 'staff'}</Badge>}
                          {p.is_banned && <Badge variant="destructive" className="text-[9px] px-1.5 py-0">{isRTL ? 'معطّل' : 'disabled'}</Badge>}
                        </div>
                        {userBizs.length > 0 && (
                          <div className="flex items-center gap-1 mt-1 flex-wrap">
                            {userBizs.slice(0, 2).map((b) => (
                              <span key={b.id} className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                                <Building2 className="w-2.5 h-2.5 text-success" />
                                <span className="truncate max-w-[100px]">{isRTL ? b.name_ar : (b.name_en || b.name_ar)}</span>
                              </span>
                            ))}
                            {userBizs.length > 2 && <span className="text-[10px] text-muted-foreground">+{userBizs.length - 2}</span>}
                          </div>
                        )}
                      </div>
                      {tierBadge(p.membership_tier, isRTL)}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-border/30 bg-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading font-bold text-sm flex items-center gap-2">
                <Building2 className="w-4 h-4 text-success" />
                {isRTL ? 'أحدث المنشآت' : 'Recent businesses'}
              </h3>
              <Button asChild variant="ghost" size="sm" className="text-[11px] h-7">
                <Link to="/admin/businesses">{isRTL ? 'الكل' : 'All'} <DirectionalIcon kind="forward" className="w-3 h-3 ms-1" /></Link>
              </Button>
            </div>
            {isLoading ? (
              <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)}</div>
            ) : (
              <div className="space-y-2">
                {recentBusinesses.map((b) => {
                  const owner = profileByUserId.get(b.user_id);
                  return (
                    <Link key={b.id} to={`/admin/businesses?focus=${b.id}`}
                      className="block rounded-xl bg-muted/20 hover:bg-muted/40 border border-transparent hover:border-border/40 p-2.5 transition-all hover-lift">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-success/10 flex items-center justify-center">
                          <Building2 className="w-4 h-4 text-success" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold truncate">{isRTL ? b.name_ar : (b.name_en || b.name_ar)}</p>
                            <ReferenceBadge refId={b.ref_id} />
                            {b.is_verified && <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" aria-label={isRTL ? 'موثّق' : 'verified'} />}
                            {!b.is_active && <Badge variant="outline" className="text-[9px] border-dashed text-muted-foreground">{isRTL ? 'غير نشط' : 'inactive'}</Badge>}
                          </div>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {b.username && <span className="text-[10px] text-muted-foreground tech-content">@{b.username}</span>}
                            {owner && (
                              <EntityLink type="user" refId={owner.ref_id} targetId={owner.user_id}
                                name={owner.full_name || undefined}
                                hint={isRTL ? 'مالك' : 'owner'} />
                            )}
                          </div>
                        </div>
                        {tierBadge(b.membership_tier, isRTL)}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ─── Footer hint ─── */}
        </>)}

        <p className="text-[11px] text-muted-foreground text-center pt-2">
          {isRTL
            ? 'مركز موحّد للحسابات والموافقات. الإدارة التفصيلية (تعديل، حذف، توثيق، فروع، صلاحيات…) متاحة عبر روابط الإجراءات.'
            : 'Unified accounts & approvals hub. Detailed management (edit, delete, verify, branches, roles…) is reachable via row actions.'}
        </p>
      </div>
      <IdentityCommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        isRTL={isRTL}
        profiles={profiles}
        businesses={businesses}
      />
    </DashboardLayout>
  );
};

export default AdminIdentity;
