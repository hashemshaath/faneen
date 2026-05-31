/**
 * SYSTEM-ACCESS — Owner-facing Staff Module Access page.
 *
 * Lets the entity owner (or admin) restrict module visibility for each
 * staff member of their active business. The owner can only NARROW
 * what the admin already allows for the entity — never widen. Effective
 * visibility is computed server-side via `owner_get_staff_visible_modules`.
 * Per-staff toggles go through `owner_set_module_override` /
 * `owner_clear_module_override`.
 *
 * Authorization remains server-authoritative (RPCs check ownership +
 * staff membership). This page is UI only.
 */
import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/i18n/LanguageContext';
import { useActiveWorkspace } from '@/hooks/useActiveWorkspace';
import { useNoIndex } from '@/hooks/useNoIndex';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Users, Search, ShieldCheck, RotateCw, Layers, Lock, AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { listBusinessStaffByBusiness } from '@/modules/businesses/services/listBusinessStaffByBusiness';
import {
  listSystemModules,
  ownerGetStaffVisibleModules,
  ownerSetModuleOverride,
  ownerClearModuleOverride,
  type SystemModule,
  type EffectiveVisibility,
} from '@/modules/systemAccess';

interface StaffRow {
  id: string;
  user_id: string | null;
  ref_id: string | null;
  role: string | null;
  is_active: boolean | null;
  is_primary_manager: boolean | null;
  display_name: string | null;
  email: string | null;
}

export default function DashboardTeamAccess() {
  const { isRTL } = useLanguage();
  const { isAdmin, isSuperAdmin } = useAuth();
  const ws = useActiveWorkspace();
  const qc = useQueryClient();
  useNoIndex();

  const entityId = ws.active_entity_id ?? null;
  const canManage = ws.active_role === 'owner' || isAdmin || isSuperAdmin;

  const [staffSearch, setStaffSearch] = useState('');
  const [selectedStaffUserId, setSelectedStaffUserId] = useState<string | null>(null);
  const [moduleSearch, setModuleSearch] = useState('');

  const staffQuery = useQuery({
    queryKey: ['team-access', 'staff', entityId],
    enabled: !!entityId && canManage,
    queryFn: async () => {
      const { data, error } = await listBusinessStaffByBusiness<StaffRow>({
        businessId: entityId!,
        select: 'id, user_id, ref_id, role, is_active, is_primary_manager, display_name, email',
        includeInactive: false,
      });
      if (error) throw error;
      return (data ?? []) as StaffRow[];
    },
  });

  const catalogQuery = useQuery({
    queryKey: ['team-access', 'catalog'],
    queryFn: listSystemModules,
    staleTime: 5 * 60_000,
  });

  const visibilityQuery = useQuery({
    queryKey: ['team-access', 'visibility', selectedStaffUserId, entityId],
    enabled: !!selectedStaffUserId && !!entityId,
    queryFn: async () => ownerGetStaffVisibleModules(selectedStaffUserId!, entityId),
  });

  const setMutation = useMutation({
    mutationFn: ownerSetModuleOverride,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['team-access', 'visibility'] });
      toast.success(isRTL ? 'تم حفظ التغيير' : 'Saved');
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(msg || (isRTL ? 'فشل الحفظ' : 'Save failed'));
    },
  });

  const clearMutation = useMutation({
    mutationFn: ownerClearModuleOverride,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['team-access', 'visibility'] });
      toast.success(isRTL ? 'تم إعادة التعيين' : 'Reset');
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(msg || (isRTL ? 'فشل الإجراء' : 'Action failed'));
    },
  });

  const filteredStaff = useMemo(() => {
    const rows = staffQuery.data ?? [];
    if (!staffSearch) return rows;
    const s = staffSearch.toLowerCase();
    return rows.filter(r =>
      (r.display_name ?? '').toLowerCase().includes(s) ||
      (r.email ?? '').toLowerCase().includes(s) ||
      (r.ref_id ?? '').toLowerCase().includes(s) ||
      (r.role ?? '').toLowerCase().includes(s),
    );
  }, [staffQuery.data, staffSearch]);

  const visMap = useMemo(() => {
    const m = new Map<string, EffectiveVisibility>();
    for (const v of visibilityQuery.data ?? []) m.set(v.module_key, v);
    return m;
  }, [visibilityQuery.data]);

  const groupedModules = useMemo(() => {
    const mods = catalogQuery.data ?? [];
    const filtered = mods.filter(m => {
      if (!moduleSearch) return true;
      const s = moduleSearch.toLowerCase();
      return (
        m.label_ar.toLowerCase().includes(s) ||
        m.label_en.toLowerCase().includes(s) ||
        m.key.toLowerCase().includes(s)
      );
    });
    const groups = new Map<string, SystemModule[]>();
    for (const m of filtered) {
      const arr = groups.get(m.category) ?? [];
      arr.push(m);
      groups.set(m.category, arr);
    }
    return Array.from(groups.entries());
  }, [catalogQuery.data, moduleSearch]);

  const selectedStaff = useMemo(
    () => (staffQuery.data ?? []).find(s => s.user_id === selectedStaffUserId) ?? null,
    [staffQuery.data, selectedStaffUserId],
  );

  if (!entityId) {
    return (
      <DashboardLayout>
        <Card className="m-6">
          <CardContent className="p-8 text-center text-muted-foreground">
            {isRTL ? 'الرجاء اختيار حساب نشاط تجاري للمتابعة.' : 'Please select an active business workspace.'}
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  if (!canManage) {
    return (
      <DashboardLayout>
        <Card className="m-6">
          <CardContent className="p-8 text-center text-muted-foreground flex flex-col items-center gap-3">
            <Lock className="h-8 w-8 text-muted-foreground" />
            {isRTL ? 'هذه الصفحة متاحة فقط لمالك النشاط التجاري.' : 'This page is available only to the business owner.'}
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
        <header className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ShieldCheck className="h-6 w-6 text-primary" />
              {isRTL ? 'صلاحيات وصول الموظفين للأنظمة' : 'Staff System Access'}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {isRTL
                ? 'تحكم في الأنظمة والأقسام الظاهرة لكل موظف ضمن نطاق ما هو مسموح به لنشاطك التجاري.'
                : 'Control which modules each staff member can see, within the bounds your business already allows.'}
            </p>
          </div>
          <div className="rounded-lg border bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900 px-3 py-2 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2 max-w-md">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>
              {isRTL
                ? 'يمكنك فقط إخفاء الأنظمة المتاحة لنشاطك التجاري. لا يمكنك منح وصول لنظام معطّل من قبل الإدارة.'
                : 'You can only hide modules already enabled for your business. You cannot grant access to a module disabled by the admin.'}
            </span>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
          {/* Staff picker */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4" />
                {isRTL ? 'الموظفون' : 'Staff'}
                <Badge variant="outline" className="ms-auto">{filteredStaff.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="relative">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={staffSearch}
                  onChange={(e) => setStaffSearch(e.target.value)}
                  placeholder={isRTL ? 'بحث بالاسم / المعرف / الدور' : 'Search name / id / role'}
                  className="ps-9 h-10"
                />
              </div>
              <div className="max-h-[60vh] overflow-y-auto pe-1 space-y-1">
                {staffQuery.isLoading ? (
                  <>
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </>
                ) : filteredStaff.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">
                    {isRTL ? 'لا يوجد موظفون.' : 'No staff found.'}
                  </p>
                ) : (
                  filteredStaff.map(s => {
                    const selected = s.user_id === selectedStaffUserId;
                    return (
                      <button
                        type="button"
                        key={s.id}
                        disabled={!s.user_id}
                        onClick={() => s.user_id && setSelectedStaffUserId(s.user_id)}
                        className={`w-full text-start rounded-lg border px-3 py-2 text-sm transition hover-lift ${
                          selected
                            ? 'border-primary bg-primary/10 ring-1 ring-primary/40'
                            : 'border-border hover:bg-muted/40'
                        } ${!s.user_id ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <div className="font-medium truncate flex items-center gap-2">
                          {s.display_name || s.email || s.ref_id || '—'}
                          {s.is_primary_manager && (
                            <Badge variant="secondary" className="text-[10px] py-0">
                              {isRTL ? 'مدير أساسي' : 'Primary'}
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground tech-content flex items-center gap-2 mt-0.5">
                          {s.ref_id && <span>{s.ref_id}</span>}
                          {s.role && <span>· {s.role}</span>}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>

          {/* Modules panel */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 flex-wrap">
                <Layers className="h-4 w-4" />
                {isRTL ? 'الأنظمة والأقسام' : 'Modules & Sections'}
                {selectedStaff && (
                  <Badge variant="outline" className="ms-2">
                    {selectedStaff.display_name || selectedStaff.email || selectedStaff.ref_id}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!selectedStaffUserId ? (
                <div className="py-16 text-center text-muted-foreground text-sm">
                  {isRTL
                    ? 'اختر موظفاً من القائمة لإدارة الأنظمة الظاهرة له.'
                    : 'Select a staff member to manage their visible modules.'}
                </div>
              ) : (
                <>
                  <div className="relative">
                    <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={moduleSearch}
                      onChange={(e) => setModuleSearch(e.target.value)}
                      placeholder={isRTL ? 'بحث في الأنظمة' : 'Search modules'}
                      className="ps-9 h-10"
                    />
                  </div>

                  {(catalogQuery.isLoading || visibilityQuery.isLoading) ? (
                    <div className="space-y-2">
                      <Skeleton className="h-16 w-full" />
                      <Skeleton className="h-16 w-full" />
                      <Skeleton className="h-16 w-full" />
                    </div>
                  ) : groupedModules.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-6 text-center">
                      {isRTL ? 'لا توجد أنظمة مطابقة.' : 'No matching modules.'}
                    </p>
                  ) : (
                    <div className="space-y-5">
                      {groupedModules.map(([category, mods]) => (
                        <div key={category} className="space-y-2">
                          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            {category}
                          </div>
                          <Separator />
                          <div className="space-y-2">
                            {mods.map(m => {
                              const eff = visMap.get(m.key);
                              const enabled = eff ? eff.enabled : m.default_enabled;
                              const source = eff?.source ?? 'module_default';
                              const isCore = m.is_core || source === 'core';
                              // Owner can only act on entries currently enabled at the
                              // entity/admin level. If the effective visibility is OFF
                              // due to an upstream source (account_type/global/entity),
                              // disable the toggle (owner can't widen).
                              const upstreamDisabled =
                                !enabled && (source === 'account_type' || source === 'global_default' || source === 'entity');
                              const userOverride = source === 'user';

                              return (
                                <div
                                  key={m.id}
                                  className="flex items-center gap-3 rounded-lg border px-3 py-2.5 bg-background"
                                >
                                  <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium truncate flex items-center gap-2">
                                      {isRTL ? m.label_ar : m.label_en}
                                      {isCore && (
                                        <Badge variant="secondary" className="text-[10px] py-0">
                                          {isRTL ? 'أساسي' : 'Core'}
                                        </Badge>
                                      )}
                                      {userOverride && (
                                        <Badge variant="outline" className="text-[10px] py-0">
                                          {isRTL ? 'مخصص' : 'Override'}
                                        </Badge>
                                      )}
                                      {upstreamDisabled && (
                                        <Badge variant="destructive" className="text-[10px] py-0">
                                          {isRTL ? 'معطّل من الإدارة' : 'Admin disabled'}
                                        </Badge>
                                      )}
                                    </div>
                                    {(m.description_ar || m.description_en) && (
                                      <div className="text-xs text-muted-foreground truncate">
                                        {isRTL ? m.description_ar : m.description_en}
                                      </div>
                                    )}
                                    <div className="text-[10px] text-muted-foreground tech-content mt-0.5">
                                      {m.key}
                                    </div>
                                  </div>

                                  {userOverride && !isCore && selectedStaffUserId && (
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="ghost"
                                      onClick={() =>
                                        clearMutation.mutate({
                                          moduleKey: m.key,
                                          scopeType: 'user',
                                          scopeValue: selectedStaffUserId,
                                        })
                                      }
                                      disabled={clearMutation.isPending}
                                      title={isRTL ? 'إعادة تعيين' : 'Reset'}
                                    >
                                      <RotateCw className="h-4 w-4" />
                                    </Button>
                                  )}

                                  <Switch
                                    checked={enabled}
                                    disabled={
                                      isCore ||
                                      upstreamDisabled ||
                                      setMutation.isPending ||
                                      !selectedStaffUserId
                                    }
                                    onCheckedChange={(next) => {
                                      if (!selectedStaffUserId) return;
                                      setMutation.mutate({
                                        moduleKey: m.key,
                                        scopeType: 'user',
                                        scopeValue: selectedStaffUserId,
                                        enabled: next,
                                      });
                                    }}
                                  />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}