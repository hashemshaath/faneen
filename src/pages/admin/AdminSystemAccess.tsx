import React, { useMemo, useState } from 'react';
import { MaybeDashboardLayout as DashboardLayout } from '@/components/admin/MaybeDashboardLayout';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  Layers, Search, Globe, Users as UsersIcon, User as UserIcon,
  ShieldCheck, Lock, Eye, EyeOff, Sparkles, Filter, Loader2,
  AlertTriangle, RotateCcw, Info, ArrowLeft, History, Settings2,
  Check, X as XIcon, Pencil, Building2,
} from 'lucide-react';
import { useNoIndex } from '@/hooks/useNoIndex';
import {
  listSystemModules,
  listAllOverrides,
  setModuleOverride,
  clearModuleOverride,
  listAuditLog,
  type SystemModule,
  type SystemModuleOverride,
  type ScopeType,
  type SystemModuleAuditEntry,
} from '@/modules/systemAccess';
import { listProfiles } from '@/modules/users';
import { supabase } from '@/integrations/supabase/client';
import { ReferenceBadge } from '@/components/reference/ReferenceBadge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

type ScopeTab = 'global' | 'account_type' | 'entity' | 'user';
type ViewTab = 'manage' | 'audit';

const ACCOUNT_TYPES = ['provider', 'client', 'individual'] as const;
type AccountType = typeof ACCOUNT_TYPES[number];

const CATEGORY_META: Record<string, { ar: string; en: string; tone: string }> = {
  core:          { ar: 'الأساسية',     en: 'Core',          tone: 'bg-muted text-foreground border-border' },
  business:      { ar: 'الأعمال',      en: 'Business',      tone: 'bg-primary/10 text-primary border-primary/20' },
  finance:       { ar: 'المالية',      en: 'Finance',       tone: 'bg-success/10 text-success border-success/20' },
  ai:            { ar: 'الذكاء',       en: 'AI',            tone: 'bg-accent/15 text-accent border-accent/30' },
  insights:      { ar: 'التحليلات',    en: 'Insights',      tone: 'bg-info/10 text-info border-info/20' },
  marketing:     { ar: 'التسويق',      en: 'Marketing',     tone: 'bg-warning/10 text-warning border-warning/30' },
  communication: { ar: 'التواصل',      en: 'Communication', tone: 'bg-info/10 text-info border-info/20' },
  workspace:     { ar: 'مساحة العمل', en: 'Workspace',     tone: 'bg-muted text-foreground border-border' },
  general:       { ar: 'عام',          en: 'General',       tone: 'bg-muted text-foreground border-border' },
};

const AdminSystemAccess: React.FC = () => {
  useNoIndex();
  const { isRTL } = useLanguage();
  const { isAdmin } = useAuth();
  const qc = useQueryClient();

  const [scopeTab, setScopeTab] = useState<ScopeTab>('global');
  const [viewTab, setViewTab] = useState<ViewTab>('manage');
  const [accountType, setAccountType] = useState<AccountType>('provider');
  const [userSearch, setUserSearch] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [entitySearch, setEntitySearch] = useState('');
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'enabled' | 'disabled' | 'overridden'>('all');
  const [search, setSearch] = useState('');

  const modulesQuery = useQuery({
    queryKey: ['system-modules'],
    queryFn: listSystemModules,
    staleTime: 60_000,
  });

  const overridesQuery = useQuery({
    queryKey: ['system-module-overrides'],
    queryFn: listAllOverrides,
    staleTime: 30_000,
  });

  const usersQuery = useQuery({
    queryKey: ['system-access-users', userSearch],
    queryFn: async () => {
      const { data, error } = await listProfiles({
        select: 'id, user_id, full_name, email, avatar_url, ref_id, account_type',
        orderBy: { column: 'created_at', ascending: false },
      });
      if (error) throw error;
      return (data ?? []) as Array<{
        id: string; user_id: string; full_name: string | null;
        email: string | null; avatar_url: string | null;
        ref_id: string | null; account_type: string | null;
      }>;
    },
    enabled: scopeTab === 'user',
  });

  const entitiesQuery = useQuery({
    queryKey: ['system-access-entities'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('businesses')
        .select('id, name_ar, name_en, ref_id, logo_url')
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as Array<{
        id: string; name_ar: string | null; name_en: string | null;
        ref_id: string | null; logo_url: string | null;
      }>;
    },
    enabled: scopeTab === 'entity',
  });

  const setMutation = useMutation({
    mutationFn: setModuleOverride,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['system-module-overrides'] });
      toast.success(isRTL ? 'تم حفظ التغيير' : 'Saved');
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(msg || (isRTL ? 'فشل الحفظ' : 'Save failed'));
    },
  });

  const clearMutation = useMutation({
    mutationFn: clearModuleOverride,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['system-module-overrides'] });
      toast.success(isRTL ? 'تم إعادة التعيين للافتراضي' : 'Reset to default');
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(msg || (isRTL ? 'فشل الإجراء' : 'Action failed'));
    },
  });

  // Build override lookup by (scope_type, scope_value)
  const currentScopeValue: string | null = useMemo(() => {
    if (scopeTab === 'global') return null;
    if (scopeTab === 'account_type') return accountType;
    if (scopeTab === 'entity') return selectedEntityId;
    return selectedUserId;
  }, [scopeTab, accountType, selectedUserId, selectedEntityId]);

  const currentScopeType: ScopeType = useMemo(() => {
    if (scopeTab === 'global') return 'global_default';
    if (scopeTab === 'account_type') return 'account_type';
    if (scopeTab === 'entity') return 'entity';
    return 'user';
  }, [scopeTab]);

  const overrideMap = useMemo(() => {
    const map = new Map<string, SystemModuleOverride>();
    for (const o of overridesQuery.data ?? []) {
      if (o.scope_type === currentScopeType &&
          (o.scope_value ?? null) === (currentScopeValue ?? null)) {
        map.set(o.module_key, o);
      }
    }
    return map;
  }, [overridesQuery.data, currentScopeType, currentScopeValue]);

  // Group modules by category
  const grouped = useMemo(() => {
    const mods = modulesQuery.data ?? [];
    const filtered = mods.filter(m => {
      if (search) {
        const s = search.toLowerCase();
        if (!m.label_ar.toLowerCase().includes(s) &&
            !m.label_en.toLowerCase().includes(s) &&
            !m.key.toLowerCase().includes(s)) return false;
      }
      const ov = overrideMap.get(m.key);
      const effective = ov ? ov.enabled : m.default_enabled;
      if (filter === 'enabled' && !effective) return false;
      if (filter === 'disabled' && effective) return false;
      if (filter === 'overridden' && !ov) return false;
      return true;
    });
    const map = new Map<string, SystemModule[]>();
    for (const m of filtered) {
      const arr = map.get(m.category) ?? [];
      arr.push(m);
      map.set(m.category, arr);
    }
    return Array.from(map.entries());
  }, [modulesQuery.data, overrideMap, search, filter]);

  const filteredUsers = useMemo(() => {
    const list = usersQuery.data ?? [];
    if (!userSearch) return list.slice(0, 50);
    const s = userSearch.toLowerCase();
    return list.filter(u =>
      u.full_name?.toLowerCase().includes(s) ||
      u.email?.toLowerCase().includes(s) ||
      u.ref_id?.toLowerCase().includes(s),
    ).slice(0, 50);
  }, [usersQuery.data, userSearch]);

  const filteredEntities = useMemo(() => {
    const list = entitiesQuery.data ?? [];
    if (!entitySearch) return list.slice(0, 60);
    const s = entitySearch.toLowerCase();
    return list.filter(b =>
      (b.name_ar ?? '').toLowerCase().includes(s) ||
      (b.name_en ?? '').toLowerCase().includes(s) ||
      (b.ref_id ?? '').toLowerCase().includes(s),
    ).slice(0, 60);
  }, [entitiesQuery.data, entitySearch]);

  const selectedEntity = useMemo(
    () => (entitiesQuery.data ?? []).find(b => b.id === selectedEntityId) || null,
    [entitiesQuery.data, selectedEntityId],
  );

  const selectedUser = useMemo(
    () => (usersQuery.data ?? []).find(u => u.user_id === selectedUserId) || null,
    [usersQuery.data, selectedUserId],
  );

  const stats = useMemo(() => {
    const mods = modulesQuery.data ?? [];
    const visible = mods.filter(m => {
      const ov = overrideMap.get(m.key);
      return ov ? ov.enabled : m.default_enabled;
    }).length;
    const hidden = mods.length - visible;
    const overridden = mods.filter(m => overrideMap.has(m.key)).length;
    return { total: mods.length, visible, hidden, overridden };
  }, [modulesQuery.data, overrideMap]);

  const canEdit = scopeTab === 'global' || scopeTab === 'account_type'
    ? true
    : scopeTab === 'entity'
      ? !!selectedEntityId
      : !!selectedUserId;

  const handleToggle = (m: SystemModule, nextEnabled: boolean) => {
    if (m.is_core && !nextEnabled) {
      toast.error(isRTL ? 'لا يمكن إخفاء الأنظمة الأساسية' : 'Core modules cannot be disabled');
      return;
    }
    setMutation.mutate({
      moduleKey: m.key,
      scopeType: currentScopeType,
      scopeValue: currentScopeValue,
      enabled: nextEnabled,
    });
  };

  const handleReset = (m: SystemModule) => {
    clearMutation.mutate({
      moduleKey: m.key,
      scopeType: currentScopeType,
      scopeValue: currentScopeValue,
    });
  };

  const loading = modulesQuery.isLoading || overridesQuery.isLoading;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-heading font-bold text-2xl text-foreground flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent/20 to-primary/10 flex items-center justify-center shadow-sm">
                <Layers className="w-5 h-5 text-accent" />
              </div>
              {isRTL ? 'التحكم بإظهار الأنظمة' : 'System Access Control'}
            </h1>
            <p className="text-muted-foreground font-body mt-1 text-sm max-w-2xl">
              {isRTL
                ? 'تحكم بإظهار وإخفاء أنظمة وأقسام المنصة على ثلاثة مستويات: عام (للجميع)، حسب نوع الحساب، أو لمستخدم محدد.'
                : 'Control visibility of platform systems at three levels: global default, per account type, or per individual user.'}
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <StatChip icon={Layers}     label={isRTL ? 'إجمالي' : 'Total'}      value={stats.total} tone="bg-muted text-foreground" />
            <StatChip icon={Eye}        label={isRTL ? 'ظاهرة' : 'Visible'}    value={stats.visible} tone="bg-success/15 text-success" />
            <StatChip icon={EyeOff}     label={isRTL ? 'مخفية' : 'Hidden'}     value={stats.hidden} tone="bg-destructive/15 text-destructive" />
            <StatChip icon={Sparkles}   label={isRTL ? 'مخصصة' : 'Overridden'} value={stats.overridden} tone="bg-accent/15 text-accent" />
          </div>
        </div>

        {!isAdmin && (
          <div className="rounded-2xl border border-warning/40 bg-warning/10 p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
            <div className="text-sm">
              <div className="font-semibold">{isRTL ? 'وصول للقراءة فقط' : 'Read-only access'}</div>
              <div className="text-muted-foreground mt-0.5">
                {isRTL ? 'التعديل متاح للأدمن فقط.' : 'Only admins can modify visibility rules.'}
              </div>
            </div>
          </div>
        )}

        {/* View tabs: Manage / Audit Log */}
        <div className="flex rounded-2xl bg-muted/40 p-1 gap-1">
          <button
            onClick={() => setViewTab('manage')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all ${
              viewTab === 'manage' ? 'bg-card text-foreground shadow-sm ring-1 ring-border/30' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Settings2 className="w-4 h-4" />
            {isRTL ? 'إدارة الإظهار' : 'Manage Visibility'}
          </button>
          <button
            onClick={() => setViewTab('audit')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all ${
              viewTab === 'audit' ? 'bg-card text-foreground shadow-sm ring-1 ring-border/30' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <History className="w-4 h-4" />
            {isRTL ? 'سجل التدقيق' : 'Audit Log'}
          </button>
        </div>

        {viewTab === 'audit' ? (
          <AuditLogPanel modules={modulesQuery.data ?? []} />
        ) : (
        <>
        {/* Scope Tabs */}
        <div className="rounded-2xl border border-border/30 bg-card p-4 space-y-4">
          <div className="flex rounded-2xl bg-muted/40 p-1 gap-1 flex-wrap">
            <ScopeTabBtn active={scopeTab === 'global'} onClick={() => setScopeTab('global')}
              icon={Globe} label={isRTL ? 'الافتراضي العام' : 'Global Default'} />
            <ScopeTabBtn active={scopeTab === 'account_type'} onClick={() => setScopeTab('account_type')}
              icon={UsersIcon} label={isRTL ? 'حسب نوع الحساب' : 'By Account Type'} />
            <ScopeTabBtn active={scopeTab === 'entity'} onClick={() => { setScopeTab('entity'); setSelectedEntityId(null); }}
              icon={Building2} label={isRTL ? 'لمنشأة محددة' : 'Per Business'} />
            <ScopeTabBtn active={scopeTab === 'user'} onClick={() => { setScopeTab('user'); setSelectedUserId(null); }}
              icon={UserIcon} label={isRTL ? 'مستخدم محدد' : 'Per User'} />
          </div>

          {scopeTab === 'global' && (
            <div className="rounded-xl bg-info/10 border border-info/20 p-3 flex items-start gap-2 text-sm">
              <Info className="w-4 h-4 text-info shrink-0 mt-0.5" />
              <span>{isRTL
                ? 'هذه القواعد تنطبق على جميع المستخدمين كافتراضي عام، ويمكن تجاوزها بقواعد نوع الحساب أو قواعد المستخدم.'
                : 'These rules apply to all users as a global default; can be overridden per account type or per user.'}</span>
            </div>
          )}

          {scopeTab === 'account_type' && (
            <div className="flex flex-wrap gap-2">
              {ACCOUNT_TYPES.map(t => (
                <button
                  key={t}
                  onClick={() => setAccountType(t)}
                  className={`px-4 h-10 rounded-xl text-sm font-medium transition-all border ${
                    accountType === t
                      ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                      : 'bg-muted/30 text-foreground border-border hover:bg-muted'
                  }`}
                >
                  {t === 'provider' ? (isRTL ? 'مزوّد' : 'Provider')
                    : t === 'client' ? (isRTL ? 'عميل' : 'Client')
                    : (isRTL ? 'فرد' : 'Individual')}
                </button>
              ))}
            </div>
          )}

          {scopeTab === 'user' && !selectedUserId && (
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" style={{ insetInlineStart: '12px' }} />
                <Input
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                  placeholder={isRTL ? 'ابحث باسم أو بريد أو معرف USR-...' : 'Search name, email, or USR- ID'}
                  className="ps-10 h-11 rounded-xl"
                />
              </div>
              {usersQuery.isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center text-muted-foreground text-sm py-6">
                  {isRTL ? 'لا توجد نتائج' : 'No results'}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-80 overflow-y-auto pr-1">
                  {filteredUsers.map(u => (
                    <button
                      key={u.user_id}
                      onClick={() => setSelectedUserId(u.user_id)}
                      className="text-start rounded-xl border border-border/30 bg-card p-3 hover:bg-muted/40 transition-colors flex items-center gap-3"
                    >
                      <Avatar className="w-9 h-9">
                        <AvatarImage src={u.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                          {(u.full_name || '?').charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-sm truncate">
                            {u.full_name || (isRTL ? 'بدون اسم' : 'No name')}
                          </span>
                          <ReferenceBadge refId={u.ref_id} />
                        </div>
                        <div className="text-[11px] text-muted-foreground truncate">{u.email}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {scopeTab === 'user' && selectedUserId && selectedUser && (
            <div className="flex items-center justify-between gap-3 rounded-xl bg-muted/30 p-3 border border-border/30">
              <div className="flex items-center gap-3 min-w-0">
                <Avatar className="w-9 h-9">
                  <AvatarImage src={selectedUser.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                    {(selectedUser.full_name || '?').charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-semibold text-sm truncate">{selectedUser.full_name}</span>
                    <ReferenceBadge refId={selectedUser.ref_id} />
                    {selectedUser.account_type && (
                      <Badge variant="outline" className="text-[10px]">{selectedUser.account_type}</Badge>
                    )}
                  </div>
                  <div className="text-[11px] text-muted-foreground truncate">{selectedUser.email}</div>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedUserId(null)}
                className="gap-1.5">
                <ArrowLeft className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
                {isRTL ? 'تغيير المستخدم' : 'Change user'}
              </Button>
            </div>
          )}
        </div>

        {/* Filters bar */}
        {canEdit && (
          <div className="rounded-2xl border border-border/30 bg-card p-3 flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" style={{ insetInlineStart: '12px' }} />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={isRTL ? 'ابحث في الأنظمة...' : 'Search modules...'}
                className="ps-10 h-10 rounded-xl"
              />
            </div>
            <div className="flex items-center gap-1 rounded-xl bg-muted/40 p-1">
              {(['all', 'enabled', 'disabled', 'overridden'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 h-8 rounded-lg text-xs font-medium transition-all ${
                    filter === f ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {f === 'all' ? (isRTL ? 'الكل' : 'All')
                    : f === 'enabled' ? (isRTL ? 'ظاهر' : 'Visible')
                    : f === 'disabled' ? (isRTL ? 'مخفي' : 'Hidden')
                    : (isRTL ? 'مخصص' : 'Overridden')}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Modules grouped by category */}
        {canEdit ? (
          loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
            </div>
          ) : grouped.length === 0 ? (
            <div className="rounded-2xl border border-border/30 bg-card p-10 text-center text-muted-foreground text-sm">
              {isRTL ? 'لا توجد أنظمة مطابقة للفلتر الحالي' : 'No modules match current filter'}
            </div>
          ) : (
            <div className="space-y-4">
              {grouped.map(([cat, mods]) => {
                const meta = CATEGORY_META[cat] ?? CATEGORY_META.general;
                return (
                  <div key={cat} className="rounded-2xl border border-border/30 bg-card overflow-hidden">
                    <div className="px-4 py-3 border-b border-border/30 bg-muted/20 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Badge className={`text-[11px] ${meta.tone} border`}>
                          {isRTL ? meta.ar : meta.en}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {mods.length} {isRTL ? 'نظام' : 'modules'}
                        </span>
                      </div>
                    </div>
                    <div className="divide-y divide-border/30">
                      {mods.map(m => {
                        const ov = overrideMap.get(m.key);
                        const effective = ov ? ov.enabled : m.default_enabled;
                        const isOverridden = !!ov;
                        const isPending = (setMutation.isPending || clearMutation.isPending)
                          && (setMutation.variables?.moduleKey === m.key
                              || clearMutation.variables?.moduleKey === m.key);
                        return (
                          <div key={m.key}
                            className={`px-4 py-3 flex items-start gap-3 transition-colors ${
                              isOverridden ? 'bg-accent/5' : ''
                            }`}>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-sm">
                                  {isRTL ? m.label_ar : m.label_en}
                                </span>
                                <code className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground tech-content">
                                  {m.key}
                                </code>
                                {m.is_core && (
                                  <Badge variant="outline" className="text-[10px] gap-1 border-warning/40 text-warning">
                                    <Lock className="w-2.5 h-2.5" />
                                    {isRTL ? 'أساسي' : 'Core'}
                                  </Badge>
                                )}
                                {isOverridden && (
                                  <Badge className="text-[10px] gap-1 bg-accent/15 text-accent border border-accent/30">
                                    <Sparkles className="w-2.5 h-2.5" />
                                    {isRTL ? 'مخصص' : 'Override'}
                                  </Badge>
                                )}
                                {!isOverridden && (
                                  <Badge variant="outline" className="text-[10px] text-muted-foreground">
                                    {isRTL ? 'افتراضي' : 'Default'}
                                  </Badge>
                                )}
                              </div>
                              {(m.description_ar || m.description_en) && (
                                <p className="text-xs text-muted-foreground mt-1 truncate">
                                  {isRTL ? m.description_ar : m.description_en}
                                </p>
                              )}
                              {m.route && (
                                <code className="text-[10px] text-muted-foreground tech-content mt-1 inline-block">
                                  {m.route}
                                </code>
                              )}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {isOverridden && isAdmin && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 gap-1 text-xs text-muted-foreground hover:text-foreground"
                                  onClick={() => handleReset(m)}
                                  disabled={isPending}
                                  title={isRTL ? 'إعادة للافتراضي' : 'Reset to default'}
                                >
                                  <RotateCcw className="w-3 h-3" />
                                  {isRTL ? 'إعادة' : 'Reset'}
                                </Button>
                              )}
                              {isPending ? (
                                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                              ) : (
                                <Switch
                                  checked={effective}
                                  onCheckedChange={(v) => handleToggle(m, v)}
                                  disabled={!isAdmin || m.is_core}
                                  aria-label={`Toggle ${m.key}`}
                                />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
            <UserIcon className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <div className="font-semibold text-sm">
              {isRTL ? 'اختر مستخدماً لإدارة صلاحياته' : 'Pick a user to manage their visibility'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {isRTL
                ? 'قواعد المستخدم تتفوق على قواعد نوع الحساب والافتراضي العام.'
                : 'User rules override account-type and global defaults.'}
            </p>
          </div>
        )}
        </>
        )}
      </div>
    </DashboardLayout>
  );
};

const StatChip: React.FC<{
  icon: React.ElementType;
  label: string;
  value: number;
  tone: string;
}> = ({ icon: Icon, label, value, tone }) => (
  <div className={`rounded-xl px-3 py-2 flex items-center gap-2 ${tone}`}>
    <Icon className="w-4 h-4 shrink-0" />
    <div className="min-w-0">
      <div className="text-[10px] opacity-80 leading-tight">{label}</div>
      <div className="text-sm font-bold leading-tight tech-content">{value}</div>
    </div>
  </div>
);

const ScopeTabBtn: React.FC<{
  active: boolean;
  onClick: () => void;
  icon: React.ElementType;
  label: string;
}> = ({ active, onClick, icon: Icon, label }) => (
  <button
    onClick={onClick}
    className={`flex-1 min-w-[140px] flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all ${
      active ? 'bg-card text-foreground shadow-sm ring-1 ring-border/30' : 'text-muted-foreground hover:text-foreground'
    }`}
  >
    <Icon className="w-4 h-4" />
    {label}
  </button>
);

const AuditLogPanel: React.FC<{ modules: SystemModule[] }> = ({ modules }) => {
  const { isRTL, language } = useLanguage();
  const [actionFilter, setActionFilter] = useState<'all' | 'grant' | 'revoke' | 'reset' | 'update'>('all');

  const auditQuery = useQuery({
    queryKey: ['system-module-audit', 200],
    queryFn: () => listAuditLog(200),
    staleTime: 15_000,
  });

  const moduleLabel = useMemo(() => {
    const map = new Map<string, { ar: string; en: string }>();
    modules.forEach(m => map.set(m.key, { ar: m.label_ar, en: m.label_en }));
    return map;
  }, [modules]);

  const filtered = useMemo(() => {
    const list = auditQuery.data ?? [];
    if (actionFilter === 'all') return list;
    return list.filter(e => e.action === actionFilter);
  }, [auditQuery.data, actionFilter]);

  const formatTime = (iso: string): string => {
    const d = new Date(iso);
    return d.toLocaleString(language === 'ar' ? 'ar-SA-u-nu-latn' : 'en', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };

  const actionMeta = (a: SystemModuleAuditEntry['action']) => {
    if (a === 'grant') return { icon: Check, color: 'bg-success/15 text-success border-success/30', ar: 'منح', en: 'Granted' };
    if (a === 'revoke') return { icon: XIcon, color: 'bg-destructive/15 text-destructive border-destructive/30', ar: 'حجب', en: 'Revoked' };
    if (a === 'reset') return { icon: RotateCcw, color: 'bg-muted text-foreground border-border', ar: 'إعادة', en: 'Reset' };
    return { icon: Pencil, color: 'bg-info/15 text-info border-info/30', ar: 'تحديث', en: 'Updated' };
  };

  const scopeLabel = (e: SystemModuleAuditEntry): string => {
    if (e.scope_type === 'global_default') return isRTL ? 'افتراضي عام' : 'Global default';
    if (e.scope_type === 'account_type') return `${isRTL ? 'نوع حساب' : 'Account type'}: ${e.scope_value}`;
    return `${isRTL ? 'مستخدم' : 'User'}: ${(e.scope_value ?? '').slice(0, 8)}…`;
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border/30 bg-card p-3 flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1 rounded-xl bg-muted/40 p-1">
          {(['all','grant','revoke','reset','update'] as const).map(a => (
            <button
              key={a}
              onClick={() => setActionFilter(a)}
              className={`px-3 h-8 rounded-lg text-xs font-medium transition-all ${
                actionFilter === a ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {a === 'all' ? (isRTL ? 'الكل' : 'All')
                : a === 'grant' ? (isRTL ? 'منح' : 'Grant')
                : a === 'revoke' ? (isRTL ? 'حجب' : 'Revoke')
                : a === 'reset' ? (isRTL ? 'إعادة' : 'Reset')
                : (isRTL ? 'تحديث' : 'Update')}
            </button>
          ))}
        </div>
        <span className="text-xs text-muted-foreground ms-auto tech-content">
          {filtered.length} / {(auditQuery.data ?? []).length}
        </span>
      </div>

      {auditQuery.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
          {isRTL ? 'لا توجد سجلات' : 'No audit entries'}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(e => {
            const meta = actionMeta(e.action);
            const Icon = meta.icon;
            const label = moduleLabel.get(e.module_key);
            return (
              <div key={e.id} className="rounded-xl border border-border/30 bg-card p-3 flex items-start gap-3">
                <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${meta.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={`text-[10px] ${meta.color} border`}>
                      {isRTL ? meta.ar : meta.en}
                    </Badge>
                    <span className="font-semibold text-sm">
                      {label ? (isRTL ? label.ar : label.en) : e.module_key}
                    </span>
                    <code className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground tech-content">
                      {e.module_key}
                    </code>
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                    <span>{scopeLabel(e)}</span>
                    {e.previous_enabled !== null && e.new_enabled !== null && (
                      <span>
                        {e.previous_enabled ? (isRTL ? 'كان: ظاهر' : 'was: visible') : (isRTL ? 'كان: مخفي' : 'was: hidden')}
                        {' → '}
                        {e.new_enabled ? (isRTL ? 'أصبح: ظاهر' : 'now: visible') : (isRTL ? 'أصبح: مخفي' : 'now: hidden')}
                      </span>
                    )}
                    <span className="tech-content">{formatTime(e.created_at)}</span>
                  </div>
                  {e.reason && (
                    <div className="text-xs text-muted-foreground mt-1 italic">"{e.reason}"</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminSystemAccess;