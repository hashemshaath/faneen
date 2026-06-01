import React, { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Lock, Loader2, Layers, ShieldCheck, AlertTriangle } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useNoIndex } from '@/hooks/useNoIndex';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  listMembershipPlanModules,
  superAdminSetMembershipPlanModule,
  type MembershipPlanModuleRow,
} from '@/modules/systemAccess';
import { listAdminMembershipPlans } from '@/modules/memberships';

interface PlanLite {
  id: string;
  name_ar: string | null;
  name_en: string | null;
  tier: string | null;
  is_active: boolean | null;
}

/** MEMBERSHIP-SYSTEM-ACCESS-GOVERNANCE-2-UI — plan × module matrix editor. */
const AdminMembershipPlanModules: React.FC = () => {
  useNoIndex();
  const { isRTL } = useLanguage();
  const { isSuperAdmin, isAdmin } = useAuth();
  const qc = useQueryClient();
  const [busyCell, setBusyCell] = useState<string | null>(null);

  const plansQuery = useQuery({
    queryKey: ['admin-membership-plans'],
    queryFn: async () => {
      const { data, error } = await listAdminMembershipPlans<PlanLite>();
      if (error) throw error;
      return (data ?? []).filter((p) => p.is_active !== false);
    },
  });

  const plans = plansQuery.data ?? [];

  const matrixQueries = useQuery({
    queryKey: ['membership-plan-modules-matrix', plans.map((p) => p.id).sort().join(',')],
    enabled: plans.length > 0,
    queryFn: async () => {
      const entries = await Promise.all(
        plans.map(async (p) => [p.id, await listMembershipPlanModules(p.id)] as const),
      );
      const map: Record<string, MembershipPlanModuleRow[]> = {};
      for (const [id, rows] of entries) map[id] = rows;
      return map;
    },
  });

  const modules = useMemo<MembershipPlanModuleRow[]>(() => {
    const data = matrixQueries.data;
    if (!data) return [];
    const first = plans[0] ? data[plans[0].id] : [];
    return first ?? [];
  }, [matrixQueries.data, plans]);

  const getEnabled = (planId: string, moduleKey: string): boolean => {
    const rows = matrixQueries.data?.[planId];
    return rows?.find((r) => r.module_key === moduleKey)?.enabled ?? false;
  };

  const handleToggle = async (planId: string, mod: MembershipPlanModuleRow, next: boolean) => {
    if (!isSuperAdmin) {
      toast.error(isRTL ? 'يتطلب صلاحية مدير عام' : 'Super Admin required');
      return;
    }
    if (mod.is_core && !next) {
      toast.error(isRTL ? 'لا يمكن تعطيل النظام الأساسي' : 'Core module cannot be disabled');
      return;
    }
    const cellKey = `${planId}:${mod.module_key}`;
    setBusyCell(cellKey);
    try {
      await superAdminSetMembershipPlanModule({
        planId,
        moduleKey: mod.module_key,
        enabled: next,
      });
      toast.success(isRTL ? 'تم الحفظ' : 'Saved');
      await qc.invalidateQueries({ queryKey: ['membership-plan-modules-matrix'] });
      await qc.invalidateQueries({ queryKey: ['system-modules'] });
      await qc.invalidateQueries({ queryKey: ['effective-business-access'] });
      await qc.invalidateQueries({ queryKey: ['visible-modules'] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setBusyCell(null);
    }
  };

  const loading = plansQuery.isLoading || matrixQueries.isLoading;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-heading font-bold text-2xl text-foreground flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent/20 to-primary/10 flex items-center justify-center shadow-sm">
              <Layers className="w-5 h-5 text-accent" />
            </div>
            {isRTL ? 'مصفوفة الخدمات' : 'Plan Modules Matrix'}
          </h1>
          <p className="text-muted-foreground font-body mt-1 text-sm max-w-2xl">
            {isRTL
              ? 'تحكم بأي الأنظمة متاحة لكل باقة عضوية. الأنظمة الأساسية لا يمكن تعطيلها. كل تغيير يُسجّل في سجل التدقيق.'
              : 'Control which modules are available per membership plan. Core modules cannot be disabled. Every change is recorded in the audit log.'}
          </p>
        </div>
        <Badge variant="outline" className="flex items-center gap-2">
          <ShieldCheck className="w-3.5 h-3.5" />
          {isSuperAdmin
            ? (isRTL ? 'وضع المدير العام' : 'Super Admin')
            : (isRTL ? 'قراءة فقط' : 'Read-only')}
        </Badge>
      </div>

      {!isAdmin && (
        <div className="rounded-2xl border border-warning/40 bg-warning/10 p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
          <div className="text-sm">
            {isRTL ? 'لا تملك صلاحية الوصول.' : 'You do not have access.'}
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-xl" />
          ))}
        </div>
      ) : plans.length === 0 || modules.length === 0 ? (
        <div className="rounded-2xl border border-border/30 bg-card p-8 text-center text-sm text-muted-foreground">
          {isRTL ? 'لا توجد باقات أو أنظمة لعرضها.' : 'No plans or modules to display.'}
        </div>
      ) : (
        <div className="rounded-2xl border border-border/30 bg-card overflow-x-auto">
          <table className="w-full text-sm" data-testid="plan-modules-matrix">
            <thead className="bg-muted/40 sticky top-0">
              <tr>
                <th className="text-start p-3 font-semibold min-w-[220px]">
                  {isRTL ? 'النظام' : 'Module'}
                </th>
                {plans.map((p) => (
                  <th key={p.id} className="p-3 font-semibold text-center min-w-[140px]">
                    <div className="flex flex-col items-center gap-1">
                      <span>{isRTL ? (p.name_ar ?? p.tier) : (p.name_en ?? p.tier)}</span>
                      {p.tier && (
                        <Badge variant="outline" className="text-[10px] uppercase">
                          {p.tier}
                        </Badge>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {modules.map((m) => (
                <tr key={m.module_key} className="border-t border-border/30">
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      {m.is_core && <Lock className="w-3.5 h-3.5 text-muted-foreground" />}
                      <div>
                        <div className="font-medium">{isRTL ? m.label_ar : m.label_en}</div>
                        <div className="text-xs text-muted-foreground tech-content">{m.module_key}</div>
                      </div>
                    </div>
                  </td>
                  {plans.map((p) => {
                    const enabled = getEnabled(p.id, m.module_key);
                    const cellKey = `${p.id}:${m.module_key}`;
                    const busy = busyCell === cellKey;
                    return (
                      <td key={p.id} className="p-3 text-center">
                        {busy ? (
                          <Loader2 className="w-4 h-4 animate-spin mx-auto text-muted-foreground" />
                        ) : m.is_core ? (
                          <div
                            className="inline-flex items-center gap-1 text-xs text-muted-foreground"
                            title={isRTL ? 'أساسي ولا يمكن تعطيله' : 'Core — cannot be disabled'}
                          >
                            <Lock className="w-3 h-3" />
                            {isRTL ? 'مفعل' : 'On'}
                          </div>
                        ) : (
                          <Switch
                            checked={enabled}
                            disabled={!isSuperAdmin}
                            onCheckedChange={(v) => handleToggle(p.id, m, v)}
                            aria-label={`${m.module_key} - ${p.tier}`}
                          />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {isRTL
          ? 'كل تعديل يُسجّل تلقائياً في سجل تدقيق الأنظمة (system_module_audit_log).'
          : 'Every change is automatically recorded in the system module audit log.'}
      </p>
    </div>
  );
};

export default AdminMembershipPlanModules;