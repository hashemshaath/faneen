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
import { listProfiles } from '@/modules/users';
import { listAllUserRoles } from '@/modules/identity';
import { listAdminBusinesses } from '@/modules/businesses';
import { maskEmail, maskPhone } from '@/lib/masking';
import type { Tables } from '@/integrations/supabase/types';
import {
  Users, Building2, Search, Command, Shield, Crown, ShieldCheck, Briefcase,
  TrendingUp, UserCheck, Ban, CheckCircle2, Sparkles, Plus,
  UserPlus, Activity, ExternalLink, KeyRound, BarChart3,
  RefreshCw, Stethoscope, MapPin, ArrowUpRight,
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
    title: isRTL ? 'المستخدمون والمنشآت | إدارة قِطاعات' : 'Users & Businesses | Qitaat Admin',
    noindex: true,
  });
  const { isSuperAdmin } = useAuth();
  const [searchParams] = useSearchParams();
  const [, startTransition] = useTransition();
  const queryClient = useQueryClient();

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

  const handleSearchChange = useCallback((val: string) => {
    setSearchTerm(val);
    startTransition(() => setDeferredSearch(val));
  }, []);

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
    info: 'hover:border-info/50 hover:bg-info/5',
    success: 'hover:border-success/50 hover:bg-success/5',
    warning: 'hover:border-warning/50 hover:bg-warning/5',
    accent: 'hover:border-accent/50 hover:bg-accent/5',
    primary: 'hover:border-primary/50 hover:bg-primary/5',
  };
  const toneText: Record<string, string> = {
    info: 'text-info', success: 'text-success', warning: 'text-warning', accent: 'text-accent', primary: 'text-primary',
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-12">
        {/* ─── Header ─── */}
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary/15 to-accent/10 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl md:text-2xl font-bold font-heading leading-tight">
                {isRTL ? 'المستخدمون والمنشآت' : 'Users & Businesses'}
              </h1>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                {isRTL
                  ? 'نظرة شاملة بالإحصائيات والمؤشرات. للإدارة التفصيلية، استخدم الصفحات المخصّصة أدناه.'
                  : 'A consolidated stats overview. For full management, use the dedicated pages below.'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap xl:flex-nowrap">
            <Button
              variant="outline" size="sm" className="rounded-xl gap-1.5 h-10"
              onClick={() => setPaletteOpen(true)}
              aria-label={isRTL ? 'فتح لوحة الأوامر' : 'Open command palette'}
            >
              <Command className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{isRTL ? 'الأوامر' : 'Command'}</span>
              <kbd className="hidden md:inline-flex items-center gap-0.5 px-1.5 rounded border border-border/40 bg-muted/40 text-[10px] font-mono">
                <Command className="w-2.5 h-2.5" />K
              </kbd>
            </Button>
            <Button
              type="button" variant="outline" size="sm" className="rounded-xl gap-1.5 h-10"
              onClick={refreshAll} disabled={isLoading}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>{isRTL ? 'تحديث' : 'Refresh'}</span>
            </Button>
            {isSuperAdmin && (
              <>
                <Button asChild variant="outline" size="sm" className="rounded-xl gap-1.5 h-10">
                  <Link to="/admin/users?create=individual">
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>{isRTL ? 'مستخدم جديد' : 'New user'}</span>
                  </Link>
                </Button>
                <Button asChild size="sm" className="rounded-xl gap-1.5 h-10">
                  <Link to="/admin/businesses">
                    <Plus className="w-3.5 h-3.5" />
                    <span>{isRTL ? 'منشأة جديدة' : 'New business'}</span>
                  </Link>
                </Button>
              </>
            )}
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
          <kbd
            className="hidden sm:inline-flex absolute top-1/2 -translate-y-1/2 items-center gap-0.5 px-2 py-0.5 rounded-md border border-border/40 bg-muted/50 text-[10px] text-muted-foreground font-mono pointer-events-none"
            style={{ insetInlineEnd: '14px' }}
          >
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

        {/* ─── KPI strip ─── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
          <Kpi icon={Shield} label={isRTL ? 'إجمالي الأدوار' : 'Role grants'} value={isLoading ? '…' : roles.length} tone="info" to="/admin/access-management" />
        </div>

        {/* ─── Management navigation grid ─── */}
        <section aria-labelledby="mgmt-heading" className="rounded-2xl border border-border/40 bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 id="mgmt-heading" className="font-heading font-bold text-sm flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-accent" />
              {isRTL ? 'الإدارة التفصيلية' : 'Detailed management'}
            </h2>
            <p className="text-[11px] text-muted-foreground">
              {isRTL ? 'صفحات مستقلّة لكل جانب' : 'Dedicated page per surface'}
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {managementSurfaces.map((s) => (
              <Link
                key={s.to}
                to={s.to}
                className={`group rounded-xl border border-border/40 bg-background/40 p-3.5 transition-all hover-lift ${toneRing[s.tone]}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className={`inline-flex h-9 w-9 items-center justify-center rounded-lg bg-card ${toneText[s.tone]}`}>
                    <s.icon className="w-4 h-4" />
                  </span>
                  {typeof s.count === 'number' && !isLoading && (
                    <Badge variant="outline" className="tech-content text-[10px] tabular-nums">{s.count}</Badge>
                  )}
                  <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground/60 group-hover:text-foreground transition-colors ms-auto" />
                </div>
                <p className="mt-2 font-heading text-sm font-bold leading-tight">{isRTL ? s.ar : s.en}</p>
                <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
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
        <p className="text-[11px] text-muted-foreground text-center pt-2">
          {isRTL
            ? 'هذه الصفحة للنظرة العامة والإحصائيات فقط. كل عمليات الإدارة (تعديل، حذف، توثيق، فروع، صلاحيات…) متاحة في الصفحات المخصّصة أعلاه.'
            : 'This page is overview-only. All admin operations (edit, delete, verify, branches, roles…) live in the dedicated pages above.'}
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
