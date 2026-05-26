/**
 * AdminIdentity — Unified identity & accounts hub.
 *
 * Merges the previously separate /admin/users and /admin/businesses screens
 * into a single command center, while preserving every existing capability
 * by linking deep actions back to the battle-tested specialist pages.
 *
 * Feature inventory (kept available, see destination):
 *  - User CRUD, ban/unban, roles, password, bulk            → /admin/users
 *  - Business CRUD, verify, tiers, branches, services       → /admin/businesses
 *  - Provider approval review                               → /admin/provider-review
 *  - Memberships, payments, events                          → /admin/memberships*
 *  - Access management & RLS roles                          → /admin/access-management
 *
 * This shell adds:
 *  - Combined KPIs spanning both entities
 *  - Unified ⌘K search (users + businesses + ref_ids)
 *  - Bidirectional cross-links via <EntityLink />
 *  - Single navigation surface for non-technical admins
 *
 * Security: requireAdmin for the shell. PII rows respect existing maskEmail /
 * maskPhone behaviour from the specialist pages.
 */
import React, { useState, useMemo, useEffect, useRef, useTransition, useCallback, Suspense, lazy } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { AdminEmbeddedContext } from '@/contexts/AdminTabsContext';
import { Loader2, KeyRound as KeyRoundIcon } from 'lucide-react';
import { ReferenceBadge } from '@/components/reference/ReferenceBadge';
import { DirectionalIcon } from '@/components/ui/directional-icon';
import { EntityLink } from '@/components/admin/identity/EntityLink';
import { IdentityFilters, EMPTY_FILTERS, type IdentityFilterState, type SavedView } from '@/components/admin/identity/IdentityFilters';
import { IdentityAnalytics } from '@/components/admin/identity/IdentityAnalytics';
import { listProfiles } from '@/modules/users';
import { listAllUserRoles } from '@/modules/identity';
import { listAdminBusinesses } from '@/modules/businesses';
import { maskEmail, maskPhone } from '@/lib/masking';
import type { Tables } from '@/integrations/supabase/types';
import {
  Users, Building2, Search, Command, Shield, Crown, ShieldCheck, Briefcase,
  TrendingUp, UserCheck, Ban, CheckCircle2, Sparkles, Plus,
  UserPlus, Activity, ExternalLink, KeyRound, BarChart3,
} from 'lucide-react';

/* Lazy-loaded specialist admin pages, embedded inside Identity tabs. */
const EmbeddedUsers              = lazy(() => import('./AdminUsers'));
const EmbeddedBusinesses         = lazy(() => import('./AdminBusinesses'));
const EmbeddedProviderReview     = lazy(() => import('./AdminProviderReview'));
const EmbeddedAccessRequests     = lazy(() => import('./AdminEntityAccessRequests'));
const EmbeddedAccessManagement   = lazy(() => import('./AdminAccessManagement'));

const PanelFallback: React.FC = () => (
  <div className="flex items-center justify-center py-20 text-muted-foreground">
    <Loader2 className="w-5 h-5 animate-spin" />
  </div>
);

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

type View =
  | 'overview'
  | 'users'
  | 'businesses'
  | 'provider-review'
  | 'access-requests'
  | 'access-management'
  | 'analytics';

/* ─── KPI card ─── */
const Kpi: React.FC<{
  icon: React.ElementType; label: string; value: number | string;
  tone: 'primary' | 'success' | 'info' | 'warning' | 'accent';
  to?: string; hint?: string;
}> = ({ icon: Icon, label, value, tone, to, hint }) => {
  const toneMap = {
    primary: 'from-primary/10 to-primary/5 text-primary',
    success: 'from-success/10 to-success/5 text-success',
    info:    'from-info/10 to-info/5 text-info',
    warning: 'from-warning/10 to-warning/5 text-warning',
    accent:  'from-accent/10 to-accent/5 text-accent',
  } as const;
  const body = (
    <div className={`relative overflow-hidden rounded-2xl border border-border/30 bg-gradient-to-br ${toneMap[tone]} p-4 transition-all hover:shadow-md hover-lift h-full`}>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-card/60 backdrop-blur flex items-center justify-center">
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-2xl font-bold font-heading leading-none tech-content text-foreground">{value}</p>
          <p className="text-[11px] text-muted-foreground mt-1 truncate">{label}</p>
          {hint && <p className="text-[10px] text-muted-foreground/70 mt-0.5 truncate">{hint}</p>}
        </div>
        {to && <DirectionalIcon kind="forward" className="w-3.5 h-3.5 text-muted-foreground/60 opacity-0 group-hover:opacity-100 transition-opacity" />}
      </div>
    </div>
  );
  return to ? <Link to={to} className="group block">{body}</Link> : body;
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
    title: isRTL ? 'مركز الحسابات والمنشآت | إدارة قِطاعات' : 'Identity Hub | Qitaat Admin',
    noindex: true,
  });
  const { isSuperAdmin } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [, startTransition] = useTransition();

  const view = (searchParams.get('view') as View) || 'all';
  const setView = useCallback((v: View) => {
    const next = new URLSearchParams(searchParams);
    next.set('view', v);
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  // Filters (also encoded in URL for shareable deep links)
  const filters: IdentityFilterState = useMemo(() => ({
    accountType: (searchParams.get('type') as IdentityFilterState['accountType']) || 'all',
    tier: (searchParams.get('tier') as IdentityFilterState['tier']) || 'all',
    status: (searchParams.get('status') as IdentityFilterState['status']) || 'all',
  }), [searchParams]);
  const setFilters = useCallback((next: IdentityFilterState) => {
    const sp = new URLSearchParams(searchParams);
    (['accountType','tier','status'] as const).forEach(k => {
      const urlKey = k === 'accountType' ? 'type' : k;
      if (next[k] && next[k] !== 'all') sp.set(urlKey, next[k]); else sp.delete(urlKey);
    });
    setSearchParams(sp, { replace: true });
  }, [searchParams, setSearchParams]);

  const applySavedView = useCallback((v: SavedView) => {
    const sp = new URLSearchParams();
    sp.set('view', v.view);
    if (v.filters.accountType !== 'all') sp.set('type', v.filters.accountType);
    if (v.filters.tier !== 'all') sp.set('tier', v.filters.tier);
    if (v.filters.status !== 'all') sp.set('status', v.filters.status);
    setSearchParams(sp, { replace: true });
    if (v.search) {
      setSearchTerm(v.search);
      startTransition(() => setDeferredSearch(v.search));
    }
  }, [setSearchParams]);

  const [searchTerm, setSearchTerm] = useState('');
  const [deferredSearch, setDeferredSearch] = useState('');
  const searchRef = useRef<HTMLInputElement | null>(null);

  const handleSearchChange = useCallback((val: string) => {
    setSearchTerm(val);
    startTransition(() => setDeferredSearch(val));
  }, []);

  // ⌘K to focus search
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  /* ─── Data ─── */
  const { data: profiles = [], isLoading: loadingProfiles } = useQuery({
    queryKey: ['identity-profiles'],
    queryFn: async () => {
      const { data, error } = await listProfiles<Profile>({
        select: 'id, user_id, ref_id, full_name, email, phone, avatar_url, account_type, membership_tier, is_banned, is_onboarded, phone_verified, created_at, updated_at',
        orderBy: { column: 'created_at', ascending: false },
      });
      if (error) throw error;
      return (data ?? []) as Profile[];
    },
    staleTime: 2 * 60_000,
  });

  const { data: roles = [] } = useQuery({
    queryKey: ['identity-roles'],
    queryFn: () => listAllUserRoles() as Promise<UserRole[]>,
    staleTime: 5 * 60_000,
  });

  const { data: businesses = [], isLoading: loadingBiz } = useQuery({
    queryKey: ['identity-businesses'],
    queryFn: async () => {
      const { data, error } = await listAdminBusinesses<BizRow>({
        select: 'id, user_id, name_ar, name_en, ref_id, username, is_active, is_verified, approval_status, membership_tier, created_at',
      });
      if (error) throw error;
      return (data ?? []) as BizRow[];
    },
    staleTime: 2 * 60_000,
  });

  /* ─── Derived maps ─── */
  const rolesByUser = useMemo(() => {
    const m = new Map<string, UserRole[]>();
    roles.forEach(r => {
      const arr = m.get(r.user_id) || [];
      arr.push(r);
      m.set(r.user_id, arr);
    });
    return m;
  }, [roles]);

  const bizsByOwner = useMemo(() => {
    const m = new Map<string, BizRow[]>();
    businesses.forEach(b => {
      const arr = m.get(b.user_id) || [];
      arr.push(b);
      m.set(b.user_id, arr);
    });
    return m;
  }, [businesses]);

  const profileByUserId = useMemo(() => {
    const m = new Map<string, Profile>();
    profiles.forEach(p => m.set(p.user_id, p));
    return m;
  }, [profiles]);

  /* ─── Apply filters ─── */
  const filteredProfiles = useMemo(() => profiles.filter(p => {
    if (filters.accountType !== 'all' && p.account_type !== filters.accountType) return false;
    if (filters.tier !== 'all' && p.membership_tier !== filters.tier) return false;
    if (filters.status === 'disabled' && !p.is_banned) return false;
    if (filters.status === 'active' && p.is_banned) return false;
    return true;
  }), [profiles, filters]);
  const filteredBusinesses = useMemo(() => businesses.filter(b => {
    if (filters.tier !== 'all' && b.membership_tier !== filters.tier) return false;
    if (filters.status === 'verified' && !b.is_verified) return false;
    if (filters.status === 'pending' && b.approval_status !== 'pending') return false;
    if (filters.status === 'active' && !b.is_active) return false;
    if (filters.status === 'disabled' && b.is_active) return false;
    return true;
  }), [businesses, filters]);

  /* ─── Combined KPIs ─── */
  const kpis = useMemo(() => {
    const now = Date.now();
    const weekAgo = now - 7 * 86400000;
    const newUsers7d = profiles.filter(p => new Date(p.created_at).getTime() > weekAgo).length;
    const newBiz7d = businesses.filter(b => new Date(b.created_at).getTime() > weekAgo).length;
    return {
      totalUsers: profiles.length,
      totalBusinesses: businesses.length,
      providers: profiles.filter(p => p.account_type === 'business' || p.account_type === 'company').length,
      verifiedBiz: businesses.filter(b => b.is_verified).length,
      pendingBiz: businesses.filter(b => b.approval_status === 'pending').length,
      bannedUsers: profiles.filter(p => p.is_banned).length,
      staffCount: new Set(roles.filter(r => r.role === 'super_admin' || r.role === 'admin' || r.role === 'moderator').map(r => r.user_id)).size,
      newUsers7d, newBiz7d,
    };
  }, [profiles, businesses, roles]);

  /* ─── Unified search results ─── */
  const searchResults = useMemo(() => {
    if (!deferredSearch || deferredSearch.length < 2) return null;
    const q = deferredSearch.toLowerCase().trim();
    const userMatches = profiles.filter(p =>
      p.full_name?.toLowerCase().includes(q) ||
      p.email?.toLowerCase().includes(q) ||
      p.phone?.includes(deferredSearch) ||
      p.ref_id?.toLowerCase().includes(q),
    ).slice(0, 8);
    const bizMatches = businesses.filter(b =>
      b.name_ar?.toLowerCase().includes(q) ||
      b.name_en?.toLowerCase().includes(q) ||
      b.ref_id?.toLowerCase().includes(q) ||
      b.username?.toLowerCase().includes(q),
    ).slice(0, 8);
    return { users: userMatches, businesses: bizMatches };
  }, [deferredSearch, profiles, businesses]);

  const isLoading = loadingProfiles || loadingBiz;

  /* ─── Recent items for overview ─── */
  const recentUsers = useMemo(() => profiles.slice(0, 6), [profiles]);
  const recentBusinesses = useMemo(() => [...businesses].sort((a, b) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  ).slice(0, 6), [businesses]);

  return (
    <DashboardLayout>
      <div className="space-y-5 pb-12">
        {/* ─── Header ─── */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/15 to-accent/10 flex items-center justify-center shrink-0">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold font-heading">
                {isRTL ? 'مركز الحسابات والمنشآت' : 'Identity Hub'}
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isRTL
                  ? 'إدارة موحّدة للمستخدمين والمنشآت والصلاحيات في مكان واحد'
                  : 'Unified management for users, businesses, and roles in one place'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button asChild variant="outline" size="sm" className="rounded-xl gap-1.5">
              <Link to="/admin/users?create=individual">
                <UserPlus className="w-4 h-4" />{isRTL ? 'مستخدم جديد' : 'New user'}
              </Link>
            </Button>
            <Button asChild size="sm" className="rounded-xl gap-1.5">
              <Link to="/admin/businesses">
                <Plus className="w-4 h-4" />{isRTL ? 'إدارة المنشآت' : 'Manage businesses'}
              </Link>
            </Button>
          </div>
        </div>

        {/* ─── Unified search ─── */}
        <div className="relative">
          <Search className="absolute top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" style={{ insetInlineStart: '14px' }} />
          <Input
            ref={searchRef}
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder={isRTL
              ? 'بحث موحّد: اسم، بريد، هاتف، USR-… أو BIZ-…'
              : 'Unified search: name, email, phone, USR-… or BIZ-…'}
            className="ps-11 pe-20 h-12 rounded-2xl bg-card border-border/40 focus:bg-background"
            dir="auto"
          />
          <kbd className="hidden sm:inline-flex absolute top-1/2 -translate-y-1/2 items-center gap-0.5 px-2 py-0.5 rounded-md border border-border/40 bg-muted/50 text-[10px] text-muted-foreground font-mono pointer-events-none"
            style={{ insetInlineEnd: '14px' }}>
            <Command className="w-2.5 h-2.5" />K
          </kbd>
        </div>

        {/* ─── Live search results ─── */}
        {searchResults && (
          <div className="rounded-2xl border border-accent/30 bg-accent/5 p-4 animate-in slide-in-from-top-1 duration-200">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold text-muted-foreground">
                {isRTL ? 'نتائج البحث الموحّد' : 'Unified search results'}
              </p>
              <button onClick={() => handleSearchChange('')} className="text-[11px] text-muted-foreground hover:text-foreground">
                {isRTL ? 'مسح' : 'Clear'}
              </button>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {/* Users */}
              <div>
                <p className="text-[11px] font-bold text-info mb-2 flex items-center gap-1">
                  <Users className="w-3 h-3" />{isRTL ? `المستخدمون (${searchResults.users.length})` : `Users (${searchResults.users.length})`}
                </p>
                <div className="space-y-1">
                  {searchResults.users.length === 0 && (
                    <p className="text-[11px] text-muted-foreground italic">{isRTL ? 'لا توجد نتائج' : 'No matches'}</p>
                  )}
                  {searchResults.users.map(p => (
                    <Link key={p.id} to={`/admin/users?focus=${p.user_id}`}
                      className="flex items-center gap-2 rounded-lg bg-card border border-border/30 px-2 py-1.5 hover:border-info/40 hover-lift">
                      <Avatar className="w-6 h-6"><AvatarImage src={p.avatar_url || undefined} /><AvatarFallback className="text-[10px]">{(p.full_name || '?').charAt(0)}</AvatarFallback></Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{p.full_name || (isRTL ? 'بدون اسم' : 'No name')}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{isSuperAdmin ? p.email : maskEmail(p.email || '')}</p>
                      </div>
                      {p.ref_id && <ReferenceBadge refId={p.ref_id} />}
                    </Link>
                  ))}
                </div>
              </div>
              {/* Businesses */}
              <div>
                <p className="text-[11px] font-bold text-success mb-2 flex items-center gap-1">
                  <Building2 className="w-3 h-3" />{isRTL ? `المنشآت (${searchResults.businesses.length})` : `Businesses (${searchResults.businesses.length})`}
                </p>
                <div className="space-y-1">
                  {searchResults.businesses.length === 0 && (
                    <p className="text-[11px] text-muted-foreground italic">{isRTL ? 'لا توجد نتائج' : 'No matches'}</p>
                  )}
                  {searchResults.businesses.map(b => (
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

        {/* ─── KPI strip ─── */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-3">
          <Kpi icon={Users} label={isRTL ? 'إجمالي الحسابات' : 'Total accounts'} value={isLoading ? '…' : kpis.totalUsers} tone="primary" to="/admin/users"
               hint={isRTL ? `+${kpis.newUsers7d} هذا الأسبوع` : `+${kpis.newUsers7d} this week`} />
          <Kpi icon={Building2} label={isRTL ? 'المنشآت المسجّلة' : 'Registered businesses'} value={isLoading ? '…' : kpis.totalBusinesses} tone="success" to="/admin/businesses"
               hint={isRTL ? `+${kpis.newBiz7d} هذا الأسبوع` : `+${kpis.newBiz7d} this week`} />
          <Kpi icon={UserCheck} label={isRTL ? 'مزودو الخدمات' : 'Service providers'} value={isLoading ? '…' : kpis.providers} tone="info" to="/admin/users?type=business" />
          <Kpi icon={CheckCircle2} label={isRTL ? 'منشآت موثّقة' : 'Verified'} value={isLoading ? '…' : kpis.verifiedBiz} tone="accent" to="/admin/businesses" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Kpi icon={Crown} label={isRTL ? 'فريق الإدارة' : 'Admin staff'} value={isLoading ? '…' : kpis.staffCount} tone="warning" to="/admin/users?role=admin" />
          <Kpi icon={Sparkles} label={isRTL ? 'بانتظار المراجعة' : 'Pending review'} value={isLoading ? '…' : kpis.pendingBiz} tone="warning" to="/admin/provider-review" />
          <Kpi icon={Ban} label={isRTL ? 'حسابات معطّلة' : 'Disabled accounts'} value={isLoading ? '…' : kpis.bannedUsers} tone="warning" to="/admin/users?tab=disabled" />
          <Kpi icon={Shield} label={isRTL ? 'إدارة الوصول' : 'Access control'} value={isLoading ? '…' : roles.length} tone="info" to="/admin/access-management" />
        </div>

        {/* ─── Tabs ─── */}
        <Tabs value={view} onValueChange={(v) => setView(v as View)} className="w-full">
          <TabsList className="bg-card border border-border/30 rounded-2xl p-1.5 h-auto flex-wrap gap-1">
            <TabsTrigger value="overview" className="rounded-xl gap-1.5 py-2"><Activity className="w-3.5 h-3.5" />{isRTL ? 'نظرة عامة' : 'Overview'}</TabsTrigger>
            <TabsTrigger value="all" className="rounded-xl gap-1.5 py-2"><Sparkles className="w-3.5 h-3.5" />{isRTL ? 'الكل' : 'All'}</TabsTrigger>
            <TabsTrigger value="users" className="rounded-xl gap-1.5 py-2"><Users className="w-3.5 h-3.5" />{isRTL ? 'المستخدمون' : 'Users'}</TabsTrigger>
            <TabsTrigger value="businesses" className="rounded-xl gap-1.5 py-2"><Building2 className="w-3.5 h-3.5" />{isRTL ? 'المنشآت' : 'Businesses'}</TabsTrigger>
            <TabsTrigger value="staff" className="rounded-xl gap-1.5 py-2"><Crown className="w-3.5 h-3.5" />{isRTL ? 'فريق الإدارة' : 'Staff'}</TabsTrigger>
            <TabsTrigger value="disabled" className="rounded-xl gap-1.5 py-2"><Ban className="w-3.5 h-3.5" />{isRTL ? 'معطّلون' : 'Disabled'}</TabsTrigger>
            <TabsTrigger value="analytics" className="rounded-xl gap-1.5 py-2"><BarChart3 className="w-3.5 h-3.5" />{isRTL ? 'تحليلات' : 'Analytics'}</TabsTrigger>
          </TabsList>

          {/* Filters + Saved Views */}
          {view !== 'overview' && (
            <div className="mt-3">
              <IdentityFilters
                filters={filters}
                onChange={setFilters}
                currentView={view}
                currentSearch={deferredSearch}
                onApplyView={applySavedView}
                isRTL={isRTL}
              />
            </div>
          )}

          {/* ─── Overview tab ─── */}
          <TabsContent value="overview" className="space-y-4 mt-5">
            <div className="grid lg:grid-cols-2 gap-4">
              {/* Recent users */}
              <div className="rounded-2xl border border-border/30 bg-card p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-heading font-bold text-sm flex items-center gap-2">
                    <Users className="w-4 h-4 text-info" />{isRTL ? 'أحدث المستخدمين' : 'Recent users'}
                  </h3>
                  <Button asChild variant="ghost" size="sm" className="text-[11px] h-7">
                    <Link to="/admin/users">{isRTL ? 'الكل' : 'All'} <DirectionalIcon kind="forward" className="w-3 h-3 ms-1" /></Link>
                  </Button>
                </div>
                {isLoading ? (
                  <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)}</div>
                ) : (
                  <div className="space-y-2">
                    {recentUsers.map(p => {
                      const userBizs = bizsByOwner.get(p.user_id) || [];
                      const userRoles = rolesByUser.get(p.user_id) || [];
                      const isStaff = userRoles.some(r => ['super_admin', 'admin', 'moderator'].includes(r.role));
                      return (
                        <Link key={p.id} to={`/admin/users?focus=${p.user_id}`}
                          className="flex items-center gap-3 rounded-xl bg-muted/20 hover:bg-muted/40 border border-transparent hover:border-border/40 p-2.5 transition-all hover-lift">
                          <Avatar className="w-9 h-9"><AvatarImage src={p.avatar_url || undefined} /><AvatarFallback>{(p.full_name || '?').charAt(0)}</AvatarFallback></Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-semibold truncate">{p.full_name || (isRTL ? 'بدون اسم' : 'No name')}</p>
                              {p.ref_id && <ReferenceBadge refId={p.ref_id} />}
                              {isStaff && <Badge className="bg-warning/10 text-warning border-warning/30 text-[9px] px-1.5 py-0">{isRTL ? 'إدارة' : 'staff'}</Badge>}
                              {p.is_banned && <Badge variant="destructive" className="text-[9px] px-1.5 py-0">{isRTL ? 'معطّل' : 'disabled'}</Badge>}
                            </div>
                            {userBizs.length > 0 && (
                              <div className="flex items-center gap-1 mt-1 flex-wrap">
                                {userBizs.slice(0, 2).map(b => (
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

              {/* Recent businesses */}
              <div className="rounded-2xl border border-border/30 bg-card p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-heading font-bold text-sm flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-success" />{isRTL ? 'أحدث المنشآت' : 'Recent businesses'}
                  </h3>
                  <Button asChild variant="ghost" size="sm" className="text-[11px] h-7">
                    <Link to="/admin/businesses">{isRTL ? 'الكل' : 'All'} <DirectionalIcon kind="forward" className="w-3 h-3 ms-1" /></Link>
                  </Button>
                </div>
                {isLoading ? (
                  <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)}</div>
                ) : (
                  <div className="space-y-2">
                    {recentBusinesses.map(b => {
                      const owner = profileByUserId.get(b.user_id);
                      return (
                        <div key={b.id} className="rounded-xl bg-muted/20 hover:bg-muted/40 border border-transparent hover:border-border/40 p-2.5 transition-all">
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
                                    hint={isRTL ? 'مالك' : 'owner'}
                                  />
                                )}
                              </div>
                            </div>
                            {tierBadge(b.membership_tier, isRTL)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Quick links */}
            <div className="rounded-2xl border border-border/30 bg-card p-5">
              <h3 className="font-heading font-bold text-sm mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-accent" />{isRTL ? 'إجراءات سريعة' : 'Quick actions'}
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {[
                  { to: '/admin/users?create=individual', icon: UserPlus, ar: 'إنشاء مستخدم', en: 'Create user' },
                  { to: '/admin/users?create=provider', icon: Briefcase, ar: 'إنشاء مزود خدمة', en: 'Create provider' },
                  { to: '/admin/provider-review', icon: ShieldCheck, ar: 'مراجعة المزودين', en: 'Provider review' },
                  { to: '/admin/memberships', icon: Crown, ar: 'العضويات', en: 'Memberships' },
                  { to: '/admin/access-management', icon: Shield, ar: 'إدارة الوصول', en: 'Access management' },
                  { to: '/admin/entity-access-requests', icon: KeyRound, ar: 'طلبات الانضمام', en: 'Access requests' },
                  { to: '/admin/provider-analytics', icon: TrendingUp, ar: 'تحليلات المزودين', en: 'Provider analytics' },
                  { to: '/admin/diagnostics', icon: Activity, ar: 'التشخيص', en: 'Diagnostics' },
                ].map(l => (
                  <Link key={l.to} to={l.to}
                    className="flex items-center gap-2 rounded-xl bg-muted/30 hover:bg-accent/10 hover:text-accent border border-border/30 p-2.5 transition-all hover-lift text-xs">
                    <l.icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{isRTL ? l.ar : l.en}</span>
                    <ExternalLink className="w-3 h-3 ms-auto opacity-50" />
                  </Link>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* ─── Users tab (compact list + deep-link to full editor) ─── */}
          <TabsContent value="users" className="mt-5">
            <CompactUserList profiles={filteredProfiles} bizsByOwner={bizsByOwner} rolesByUser={rolesByUser}
              isLoading={isLoading} isRTL={isRTL} isSuperAdmin={isSuperAdmin} />
          </TabsContent>

          {/* ─── Businesses tab ─── */}
          <TabsContent value="businesses" className="mt-5">
            <CompactBusinessList businesses={filteredBusinesses} profileByUserId={profileByUserId}
              isLoading={isLoading} isRTL={isRTL} />
          </TabsContent>

          {/* ─── Staff tab ─── */}
          <TabsContent value="staff" className="mt-5">
            <CompactUserList
              profiles={filteredProfiles.filter(p => {
                const r = rolesByUser.get(p.user_id) || [];
                return r.some(x => ['super_admin', 'admin', 'moderator'].includes(x.role));
              })}
              bizsByOwner={bizsByOwner} rolesByUser={rolesByUser}
              isLoading={isLoading} isRTL={isRTL} isSuperAdmin={isSuperAdmin}
            />
          </TabsContent>

          {/* ─── Disabled tab ─── */}
          <TabsContent value="disabled" className="mt-5">
            <CompactUserList
              profiles={filteredProfiles.filter(p => p.is_banned)}
              bizsByOwner={bizsByOwner} rolesByUser={rolesByUser}
              isLoading={isLoading} isRTL={isRTL} isSuperAdmin={isSuperAdmin}
            />
          </TabsContent>

          {/* ─── All (mixed) tab — users + businesses interleaved by created_at ─── */}
          <TabsContent value="all" className="mt-5">
            <UnifiedFeed
              profiles={filteredProfiles}
              businesses={filteredBusinesses}
              bizsByOwner={bizsByOwner}
              rolesByUser={rolesByUser}
              profileByUserId={profileByUserId}
              isLoading={isLoading}
              isRTL={isRTL}
              isSuperAdmin={isSuperAdmin}
              search={deferredSearch}
            />
          </TabsContent>

          {/* ─── Analytics tab ─── */}
          <TabsContent value="analytics" className="mt-5">
            <IdentityAnalytics
              profiles={filteredProfiles}
              businesses={filteredBusinesses}
              roles={roles}
              isRTL={isRTL}
              isLoading={isLoading}
            />
          </TabsContent>
        </Tabs>

        {/* ─── Footer hint ─── */}
        <p className="text-[11px] text-muted-foreground text-center pt-2">
          {isRTL
            ? 'للتحكم المتقدّم (تعديل، حذف، تغيير كلمة المرور، إدارة الفروع…) استخدم الأزرار التي تفتح صفحات الإدارة المتخصّصة.'
            : 'For advanced actions (edit, delete, password, branch management…), use the buttons that open the specialist pages.'}
        </p>
      </div>
    </DashboardLayout>
  );
};

/* ─── Compact user list ─── */
const CompactUserList: React.FC<{
  profiles: Profile[];
  bizsByOwner: Map<string, BizRow[]>;
  rolesByUser: Map<string, UserRole[]>;
  isLoading: boolean;
  isRTL: boolean;
  isSuperAdmin: boolean;
}> = ({ profiles, bizsByOwner, rolesByUser, isLoading, isRTL, isSuperAdmin }) => {
  const [page, setPage] = useState(1);
  const PAGE = 25;
  const total = profiles.length;
  const pageCount = Math.max(1, Math.ceil(total / PAGE));
  useEffect(() => { if (page > pageCount) setPage(1); }, [pageCount, page]);
  const paginated = profiles.slice((page - 1) * PAGE, page * PAGE);

  if (isLoading) {
    return <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>;
  }
  if (profiles.length === 0) {
    return (
      <div className="rounded-2xl border border-border/30 bg-card p-12 text-center">
        <Users className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">{isRTL ? 'لا يوجد مستخدمون' : 'No users'}</p>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <p className="text-[11px] text-muted-foreground">
        {isRTL ? `${total} نتيجة • صفحة ${page}/${pageCount}` : `${total} results • Page ${page}/${pageCount}`}
      </p>
      {paginated.map(p => {
        const userBizs = bizsByOwner.get(p.user_id) || [];
        const userRoles = rolesByUser.get(p.user_id) || [];
        return (
          <div key={p.id} className="rounded-2xl border border-border/30 bg-card p-3 hover:shadow-sm hover-lift transition-all">
            <div className="flex items-start gap-3">
              <Avatar className="w-10 h-10 ring-2 ring-border/10"><AvatarImage src={p.avatar_url || undefined} /><AvatarFallback>{(p.full_name || '?').charAt(0)}</AvatarFallback></Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-sm truncate">{p.full_name || (isRTL ? 'بدون اسم' : 'No name')}</p>
                  {p.ref_id && <ReferenceBadge refId={p.ref_id} />}
                  {p.is_banned && <Badge variant="destructive" className="text-[9px] px-1.5 py-0">{isRTL ? 'معطّل' : 'disabled'}</Badge>}
                  {userRoles.map(r => (
                    <Badge key={r.id} variant="outline" className="text-[9px] px-1.5 py-0 border-warning/40 text-warning">
                      {r.role}
                    </Badge>
                  ))}
                </div>
                <div className="flex items-center gap-3 mt-1 flex-wrap text-[11px] text-muted-foreground">
                  {p.email && <span className="truncate">{isSuperAdmin ? p.email : maskEmail(p.email)}</span>}
                  {p.phone && <span className="tech-content">{isSuperAdmin ? p.phone : maskPhone(p.phone)}</span>}
                </div>
                {userBizs.length > 0 && (
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    {userBizs.map(b => (
                      <EntityLink key={b.id} type="business" refId={b.ref_id} targetId={b.id}
                        name={isRTL ? b.name_ar : (b.name_en || b.name_ar)}
                        hint={b.is_verified ? (isRTL ? 'موثّق' : 'verified') : undefined}
                      />
                    ))}
                  </div>
                )}
              </div>
              <Button asChild variant="outline" size="sm" className="rounded-xl gap-1 shrink-0">
                <Link to={`/admin/users?focus=${p.user_id}`}>
                  <ExternalLink className="w-3.5 h-3.5" />{isRTL ? 'إدارة' : 'Manage'}
                </Link>
              </Button>
            </div>
          </div>
        );
      })}
      {pageCount > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button variant="outline" size="sm" className="rounded-xl" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
            {isRTL ? 'السابق' : 'Previous'}
          </Button>
          <span className="text-xs text-muted-foreground tech-content">{page} / {pageCount}</span>
          <Button variant="outline" size="sm" className="rounded-xl" disabled={page === pageCount} onClick={() => setPage(p => p + 1)}>
            {isRTL ? 'التالي' : 'Next'}
          </Button>
        </div>
      )}
    </div>
  );
};

/* ─── Compact business list ─── */
const CompactBusinessList: React.FC<{
  businesses: BizRow[];
  profileByUserId: Map<string, Profile>;
  isLoading: boolean;
  isRTL: boolean;
}> = ({ businesses, profileByUserId, isLoading, isRTL }) => {
  const [page, setPage] = useState(1);
  const PAGE = 25;
  const total = businesses.length;
  const pageCount = Math.max(1, Math.ceil(total / PAGE));
  useEffect(() => { if (page > pageCount) setPage(1); }, [pageCount, page]);
  const paginated = businesses.slice((page - 1) * PAGE, page * PAGE);

  if (isLoading) {
    return <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>;
  }
  if (businesses.length === 0) {
    return (
      <div className="rounded-2xl border border-border/30 bg-card p-12 text-center">
        <Building2 className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">{isRTL ? 'لا توجد منشآت' : 'No businesses'}</p>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <p className="text-[11px] text-muted-foreground">
        {isRTL ? `${total} نتيجة • صفحة ${page}/${pageCount}` : `${total} results • Page ${page}/${pageCount}`}
      </p>
      {paginated.map(b => {
        const owner = profileByUserId.get(b.user_id);
        return (
          <div key={b.id} className="rounded-2xl border border-border/30 bg-card p-3 hover:shadow-sm hover-lift transition-all">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center shrink-0">
                <Building2 className="w-5 h-5 text-success" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-sm truncate">{isRTL ? b.name_ar : (b.name_en || b.name_ar)}</p>
                  <ReferenceBadge refId={b.ref_id} />
                  {b.is_verified && <CheckCircle2 className="w-3.5 h-3.5 text-success" aria-label={isRTL ? 'موثّق' : 'verified'} />}
                  {!b.is_active && <Badge variant="outline" className="text-[9px] border-dashed text-muted-foreground">{isRTL ? 'غير نشط' : 'inactive'}</Badge>}
                  {b.approval_status === 'pending' && <Badge className="bg-warning/10 text-warning border-warning/30 text-[9px] px-1.5 py-0">{isRTL ? 'بانتظار المراجعة' : 'pending'}</Badge>}
                  {tierBadge(b.membership_tier, isRTL)}
                </div>
                <div className="flex items-center gap-3 mt-1 flex-wrap text-[11px] text-muted-foreground">
                  {b.username && <span className="tech-content">@{b.username}</span>}
                </div>
                {owner && (
                  <div className="mt-2">
                    <EntityLink type="user" refId={owner.ref_id} targetId={owner.user_id}
                      name={owner.full_name || undefined}
                      hint={isRTL ? 'مالك' : 'owner'} />
                  </div>
                )}
              </div>
              <Button asChild variant="outline" size="sm" className="rounded-xl gap-1 shrink-0">
                <Link to={`/admin/businesses?focus=${b.id}`}>
                  <ExternalLink className="w-3.5 h-3.5" />{isRTL ? 'إدارة' : 'Manage'}
                </Link>
              </Button>
            </div>
          </div>
        );
      })}
      {pageCount > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button variant="outline" size="sm" className="rounded-xl" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
            {isRTL ? 'السابق' : 'Previous'}
          </Button>
          <span className="text-xs text-muted-foreground tech-content">{page} / {pageCount}</span>
          <Button variant="outline" size="sm" className="rounded-xl" disabled={page === pageCount} onClick={() => setPage(p => p + 1)}>
            {isRTL ? 'التالي' : 'Next'}
          </Button>
        </div>
      )}
    </div>
  );
};

export default AdminIdentity;

/* ─────────────────────────────────────────────────────────────────────
 * UnifiedFeed — Interleaved users + businesses with prominent linkage.
 * Each row makes it obvious who owns what and which roles apply.
 * Uses inline expansion (no popups) per UX policy.
 * ───────────────────────────────────────────────────────────────────── */
type FeedItem =
  | { kind: 'user'; id: string; created_at: string; data: Profile }
  | { kind: 'business'; id: string; created_at: string; data: BizRow };

const UnifiedFeed: React.FC<{
  profiles: Profile[];
  businesses: BizRow[];
  bizsByOwner: Map<string, BizRow[]>;
  rolesByUser: Map<string, UserRole[]>;
  profileByUserId: Map<string, Profile>;
  isLoading: boolean;
  isRTL: boolean;
  isSuperAdmin: boolean;
  search: string;
}> = ({ profiles, businesses, bizsByOwner, rolesByUser, profileByUserId, isLoading, isRTL, isSuperAdmin, search }) => {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const PAGE = 20;

  const feed = useMemo<FeedItem[]>(() => {
    const q = search.trim().toLowerCase();
    const userItems: FeedItem[] = profiles
      .filter(p => !q || p.full_name?.toLowerCase().includes(q) || p.email?.toLowerCase().includes(q) || p.ref_id?.toLowerCase().includes(q))
      .map(p => ({ kind: 'user', id: `u-${p.id}`, created_at: p.created_at, data: p }));
    const bizItems: FeedItem[] = businesses
      .filter(b => !q || b.name_ar?.toLowerCase().includes(q) || b.name_en?.toLowerCase().includes(q) || b.ref_id?.toLowerCase().includes(q))
      .map(b => ({ kind: 'business', id: `b-${b.id}`, created_at: b.created_at, data: b }));
    return [...userItems, ...bizItems].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [profiles, businesses, search]);

  const total = feed.length;
  const pageCount = Math.max(1, Math.ceil(total / PAGE));
  useEffect(() => { if (page > pageCount) setPage(1); }, [pageCount, page]);
  const paginated = feed.slice((page - 1) * PAGE, page * PAGE);

  if (isLoading) {
    return <div className="space-y-2">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}</div>;
  }
  if (total === 0) {
    return (
      <div className="rounded-2xl border border-border/30 bg-card p-12 text-center">
        <Search className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">{isRTL ? 'لا توجد نتائج' : 'No results'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-muted-foreground">
          {isRTL
            ? `${total} عنصر (مستخدمين + منشآت) • صفحة ${page}/${pageCount}`
            : `${total} items (users + businesses) • Page ${page}/${pageCount}`}
        </p>
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-info" />{isRTL ? 'مستخدم' : 'User'}</span>
          <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-success" />{isRTL ? 'منشأة' : 'Business'}</span>
        </div>
      </div>

      {paginated.map(item => {
        const isExp = expanded === item.id;
        if (item.kind === 'user') {
          const p = item.data;
          const userBizs = bizsByOwner.get(p.user_id) || [];
          const userRoles = rolesByUser.get(p.user_id) || [];
          const isStaff = userRoles.some(r => ['super_admin', 'admin', 'moderator'].includes(r.role));
          return (
            <div key={item.id} className="rounded-2xl border border-info/20 bg-card hover:border-info/40 transition-all">
              <button
                onClick={() => setExpanded(isExp ? null : item.id)}
                className="w-full text-start p-3 flex items-start gap-3 hover:bg-info/5 rounded-2xl"
              >
                <div className="relative shrink-0">
                  <Avatar className="w-11 h-11 ring-2 ring-info/20">
                    <AvatarImage src={p.avatar_url || undefined} />
                    <AvatarFallback>{(p.full_name || '?').charAt(0)}</AvatarFallback>
                  </Avatar>
                  <span className="absolute -bottom-0.5 -end-0.5 w-4 h-4 rounded-full bg-info border-2 border-card flex items-center justify-center">
                    <Users className="w-2 h-2 text-white" />
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-sm truncate">{p.full_name || (isRTL ? 'بدون اسم' : 'No name')}</p>
                    {p.ref_id && <ReferenceBadge refId={p.ref_id} />}
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-info/30 text-info">
                      {p.account_type === 'business' ? (isRTL ? 'مزود' : 'provider')
                        : p.account_type === 'company' ? (isRTL ? 'شركة' : 'company')
                        : (isRTL ? 'فرد' : 'individual')}
                    </Badge>
                    {isStaff && <Badge className="bg-warning/10 text-warning border-warning/30 text-[9px] px-1.5 py-0">{isRTL ? 'إدارة' : 'staff'}</Badge>}
                    {p.is_banned && <Badge variant="destructive" className="text-[9px] px-1.5 py-0">{isRTL ? 'معطّل' : 'disabled'}</Badge>}
                    {tierBadge(p.membership_tier, isRTL)}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground flex-wrap">
                    {p.email && <span className="truncate">{isSuperAdmin ? p.email : maskEmail(p.email)}</span>}
                    {p.phone && <span className="tech-content">{isSuperAdmin ? p.phone : maskPhone(p.phone)}</span>}
                  </div>
                  {userBizs.length > 0 && (
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      <span className="text-[10px] text-muted-foreground">{isRTL ? `مرتبط بـ ${userBizs.length}:` : `Linked to ${userBizs.length}:`}</span>
                      {userBizs.slice(0, 3).map(b => (
                        <EntityLink key={b.id} type="business" refId={b.ref_id} targetId={b.id}
                          name={isRTL ? b.name_ar : (b.name_en || b.name_ar)}
                          hint={b.is_verified ? (isRTL ? 'موثّق' : 'verified') : undefined} />
                      ))}
                      {userBizs.length > 3 && (
                        <span className="text-[10px] text-muted-foreground">+{userBizs.length - 3}</span>
                      )}
                    </div>
                  )}
                </div>
                <DirectionalIcon kind="forward" className={`w-4 h-4 text-muted-foreground transition-transform mt-1 shrink-0 ${isExp ? 'rotate-90' : ''}`} />
              </button>
              {isExp && (
                <div className="border-t border-border/30 p-4 bg-muted/10 rounded-b-2xl space-y-3 animate-in slide-in-from-top-1 duration-150">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[11px]">
                    <Detail label={isRTL ? 'معرّف داخلي' : 'Ref ID'} value={p.ref_id || '—'} mono />
                    <Detail label={isRTL ? 'النوع' : 'Type'} value={p.account_type || '—'} />
                    <Detail label={isRTL ? 'العضوية' : 'Membership'} value={p.membership_tier || 'free'} />
                    <Detail label={isRTL ? 'تاريخ الإنشاء' : 'Created'} value={new Date(p.created_at).toLocaleDateString(isRTL ? 'ar' : 'en')} />
                    <Detail label={isRTL ? 'هاتف موثّق' : 'Phone verified'} value={p.phone_verified ? '✓' : '—'} />
                    <Detail label={isRTL ? 'مكتمل التسجيل' : 'Onboarded'} value={p.is_onboarded ? '✓' : '—'} />
                    <Detail label={isRTL ? 'الأدوار' : 'Roles'} value={userRoles.map(r => r.role).join(', ') || (isRTL ? 'لا يوجد' : 'none')} />
                    <Detail label={isRTL ? 'منشآت مرتبطة' : 'Businesses'} value={String(userBizs.length)} />
                  </div>
                  {userBizs.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground mb-1.5">{isRTL ? 'كل المنشآت المرتبطة:' : 'All linked businesses:'}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {userBizs.map(b => (
                          <EntityLink key={b.id} type="business" refId={b.ref_id} targetId={b.id}
                            name={isRTL ? b.name_ar : (b.name_en || b.name_ar)}
                            hint={b.is_verified ? (isRTL ? 'موثّق' : 'verified') : (b.approval_status === 'pending' ? (isRTL ? 'بانتظار المراجعة' : 'pending') : undefined)} />
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-2 pt-1 flex-wrap">
                    <Button asChild size="sm" variant="outline" className="rounded-xl gap-1.5 h-8 text-xs">
                      <Link to={`/admin/users?focus=${p.user_id}`}>
                        <ExternalLink className="w-3 h-3" />{isRTL ? 'تعديل المستخدم' : 'Edit user'}
                      </Link>
                    </Button>
                    <Button asChild size="sm" variant="outline" className="rounded-xl gap-1.5 h-8 text-xs">
                      <Link to="/admin/access-management">
                        <Shield className="w-3 h-3" />{isRTL ? 'الصلاحيات' : 'Access'}
                      </Link>
                    </Button>
                    <Button asChild size="sm" variant="outline" className="rounded-xl gap-1.5 h-8 text-xs">
                      <Link to="/admin/memberships">
                        <Crown className="w-3 h-3" />{isRTL ? 'العضوية' : 'Membership'}
                      </Link>
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        }
        // business item
        const b = item.data;
        const owner = profileByUserId.get(b.user_id);
        return (
          <div key={item.id} className="rounded-2xl border border-success/20 bg-card hover:border-success/40 transition-all">
            <button
              onClick={() => setExpanded(isExp ? null : item.id)}
              className="w-full text-start p-3 flex items-start gap-3 hover:bg-success/5 rounded-2xl"
            >
              <div className="relative shrink-0">
                <div className="w-11 h-11 rounded-xl bg-success/10 ring-2 ring-success/20 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-success" />
                </div>
                <span className="absolute -bottom-0.5 -end-0.5 w-4 h-4 rounded-full bg-success border-2 border-card flex items-center justify-center">
                  <Briefcase className="w-2 h-2 text-white" />
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-sm truncate">{isRTL ? b.name_ar : (b.name_en || b.name_ar)}</p>
                  <ReferenceBadge refId={b.ref_id} />
                  {b.is_verified && <CheckCircle2 className="w-3.5 h-3.5 text-success" aria-label={isRTL ? 'موثّق' : 'verified'} />}
                  {!b.is_active && <Badge variant="outline" className="text-[9px] border-dashed text-muted-foreground">{isRTL ? 'غير نشط' : 'inactive'}</Badge>}
                  {b.approval_status === 'pending' && <Badge className="bg-warning/10 text-warning border-warning/30 text-[9px] px-1.5 py-0">{isRTL ? 'بانتظار المراجعة' : 'pending'}</Badge>}
                  {tierBadge(b.membership_tier, isRTL)}
                </div>
                <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground flex-wrap">
                  {b.username && <span className="tech-content">@{b.username}</span>}
                  {b.name_en && b.name_ar && (
                    <span className="opacity-70">{isRTL ? `EN: ${b.name_en}` : `AR: ${b.name_ar}`}</span>
                  )}
                </div>
                {owner && (
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    <span className="text-[10px] text-muted-foreground">{isRTL ? 'المالك:' : 'Owner:'}</span>
                    <EntityLink type="user" refId={owner.ref_id} targetId={owner.user_id}
                      name={owner.full_name || undefined}
                      hint={owner.account_type || undefined} />
                  </div>
                )}
              </div>
              <DirectionalIcon kind="forward" className={`w-4 h-4 text-muted-foreground transition-transform mt-1 shrink-0 ${isExp ? 'rotate-90' : ''}`} />
            </button>
            {isExp && (
              <div className="border-t border-border/30 p-4 bg-muted/10 rounded-b-2xl space-y-3 animate-in slide-in-from-top-1 duration-150">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[11px]">
                  <Detail label={isRTL ? 'الاسم AR' : 'Name AR'} value={b.name_ar || '—'} />
                  <Detail label={isRTL ? 'الاسم EN' : 'Name EN'} value={b.name_en || '—'} />
                  <Detail label={isRTL ? 'معرّف المنشأة' : 'Business Ref'} value={b.ref_id} mono />
                  <Detail label={isRTL ? 'اسم المستخدم' : 'Username'} value={b.username ? `@${b.username}` : '—'} mono />
                  <Detail label={isRTL ? 'حالة الموافقة' : 'Approval'} value={b.approval_status || '—'} />
                  <Detail label={isRTL ? 'نشط' : 'Active'} value={b.is_active ? '✓' : '—'} />
                  <Detail label={isRTL ? 'موثّق' : 'Verified'} value={b.is_verified ? '✓' : '—'} />
                  <Detail label={isRTL ? 'العضوية' : 'Membership'} value={b.membership_tier || 'free'} />
                </div>
                {owner && (
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground mb-1.5">{isRTL ? 'الحساب المالك:' : 'Owner account:'}</p>
                    <div className="flex items-center gap-2 p-2 rounded-xl bg-info/5 border border-info/20">
                      <Avatar className="w-8 h-8"><AvatarImage src={owner.avatar_url || undefined} /><AvatarFallback>{(owner.full_name || '?').charAt(0)}</AvatarFallback></Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-xs font-semibold truncate">{owner.full_name || (isRTL ? 'بدون اسم' : 'No name')}</p>
                          {owner.ref_id && <ReferenceBadge refId={owner.ref_id} />}
                        </div>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {isSuperAdmin ? owner.email : maskEmail(owner.email || '')}
                        </p>
                      </div>
                      <Button asChild size="sm" variant="ghost" className="h-7 rounded-lg gap-1 text-[11px]">
                        <Link to={`/admin/users?focus=${owner.user_id}`}>
                          <ExternalLink className="w-3 h-3" />{isRTL ? 'فتح' : 'Open'}
                        </Link>
                      </Button>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-2 pt-1 flex-wrap">
                  <Button asChild size="sm" variant="outline" className="rounded-xl gap-1.5 h-8 text-xs">
                    <Link to={`/admin/businesses?focus=${b.id}`}>
                      <ExternalLink className="w-3 h-3" />{isRTL ? 'تعديل المنشأة' : 'Edit business'}
                    </Link>
                  </Button>
                  <Button asChild size="sm" variant="outline" className="rounded-xl gap-1.5 h-8 text-xs">
                    <Link to="/admin/provider-review">
                      <ShieldCheck className="w-3 h-3" />{isRTL ? 'المراجعة' : 'Review'}
                    </Link>
                  </Button>
                  <Button asChild size="sm" variant="outline" className="rounded-xl gap-1.5 h-8 text-xs">
                    <Link to="/admin/locations">
                      <ExternalLink className="w-3 h-3" />{isRTL ? 'المواقع' : 'Locations'}
                    </Link>
                  </Button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {pageCount > 1 && (
        <div className="flex items-center justify-center gap-2 pt-3">
          <Button variant="outline" size="sm" className="rounded-xl" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
            {isRTL ? 'السابق' : 'Previous'}
          </Button>
          <span className="text-xs text-muted-foreground tech-content">{page} / {pageCount}</span>
          <Button variant="outline" size="sm" className="rounded-xl" disabled={page === pageCount} onClick={() => setPage(p => p + 1)}>
            {isRTL ? 'التالي' : 'Next'}
          </Button>
        </div>
      )}
    </div>
  );
};

const Detail: React.FC<{ label: string; value: string; mono?: boolean }> = ({ label, value, mono }) => (
  <div className="space-y-0.5">
    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
    <p className={`text-xs font-medium truncate ${mono ? 'tech-content font-mono' : ''}`} title={value}>{value}</p>
  </div>
);