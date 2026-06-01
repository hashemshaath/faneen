import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Check, Minus, Lock, Layers } from 'lucide-react';
import { listActiveMembershipPlans } from '@/modules/memberships';
import {
  listMembershipPlanModules,
  type MembershipPlanModuleRow,
} from '@/modules/systemAccess';
import { Skeleton } from '@/components/ui/skeleton';

interface Props {
  isRTL: boolean;
}

interface PlanLite {
  id: string;
  tier: string;
  name_ar: string | null;
  name_en: string | null;
}

/**
 * Module category → public-safe group label (Arabic-first).
 * Categories come from `system_modules.category` and are merged into the
 * seven groups the public membership spec asks for. We never invent labels
 * for unknown categories — they fall through to "general".
 */
const GROUP_LABELS: Record<string, { ar: string; en: string }> = {
  business:      { ar: 'الظهور والخدمات', en: 'Visibility & Services' },
  marketing:     { ar: 'الظهور والخدمات', en: 'Visibility & Services' },
  communication: { ar: 'طلبات العروض والفرص', en: 'Quotes & Opportunities' },
  workspace:     { ar: 'العقود والمراحل', en: 'Contracts & Stages' },
  finance:       { ar: 'العقود والمراحل', en: 'Contracts & Stages' },
  insights:      { ar: 'التحليلات والدعم', en: 'Insights & Support' },
  ai:            { ar: 'التحليلات والدعم', en: 'Insights & Support' },
  core:          { ar: 'الأساسيات', en: 'Core' },
  general:       { ar: 'أدوات إضافية', en: 'Additional Tools' },
};

/**
 * MEMBERSHIP-PAGE-REDESIGN-2 — module-driven plan matrix.
 *
 * Source of truth: `list_membership_plan_modules(plan_id)` (governed by
 * the super-admin matrix). Renders a grouped table showing which modules
 * each visible plan includes. No invented limits, no fabricated benefits.
 */
export const MembershipPlanModuleMatrix: React.FC<Props> = ({ isRTL }) => {
  const plansQuery = useQuery({
    queryKey: ['membership-plans-module-matrix'],
    queryFn: async () => {
      const { data } = await listActiveMembershipPlans<PlanLite>({
        select: 'id, tier, name_ar, name_en',
      });
      return data ?? [];
    },
    staleTime: 60_000,
  });

  const plans = plansQuery.data ?? [];

  const matrixQuery = useQuery({
    queryKey: ['membership-plan-modules-public', plans.map((p) => p.id).sort().join(',')],
    enabled: plans.length > 0,
    queryFn: async () => {
      const entries = await Promise.all(
        plans.map(async (p) => [p.id, await listMembershipPlanModules(p.id)] as const),
      );
      const map: Record<string, MembershipPlanModuleRow[]> = {};
      for (const [id, rows] of entries) map[id] = rows;
      return map;
    },
    staleTime: 60_000,
  });

  // Unique module list (taken from the first plan — server returns the
  // full active-module set joined with each plan's enabled flag).
  const modules = useMemo<MembershipPlanModuleRow[]>(() => {
    const data = matrixQuery.data;
    if (!data || plans.length === 0) return [];
    return data[plans[0].id] ?? [];
  }, [matrixQuery.data, plans]);

  const grouped = useMemo(() => {
    const groups = new Map<string, MembershipPlanModuleRow[]>();
    for (const m of modules) {
      const key = GROUP_LABELS[m.category] ? m.category : 'general';
      const arr = groups.get(key) ?? [];
      arr.push(m);
      groups.set(key, arr);
    }
    return Array.from(groups.entries());
  }, [modules]);

  const getEnabled = (planId: string, moduleKey: string): boolean =>
    matrixQuery.data?.[planId]?.find((r) => r.module_key === moduleKey)?.enabled ?? false;

  if (plansQuery.isLoading || matrixQuery.isLoading) {
    return (
      <section className="max-w-5xl mx-auto mt-12 sm:mt-16" aria-busy="true">
        <Skeleton className="h-64 w-full rounded-2xl" />
      </section>
    );
  }

  if (plans.length === 0 || modules.length === 0) return null;

  return (
    <section
      className="max-w-5xl mx-auto mt-12 sm:mt-16"
      aria-labelledby="plan-modules-title"
      data-testid="membership-plan-module-matrix"
    >
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-3">
          <Layers className="w-3.5 h-3.5" />
          {isRTL ? 'الأنظمة المتاحة لكل خطة' : 'Modules per plan'}
        </div>
        <h2 id="plan-modules-title" className="font-heading font-bold text-2xl sm:text-3xl text-foreground">
          {isRTL ? 'ما الذي تتضمنه كل عضوية؟' : 'What each plan includes'}
        </h2>
        <p className="text-sm text-muted-foreground mt-2 max-w-2xl mx-auto">
          {isRTL
            ? 'مأخوذ مباشرة من إعدادات الإدارة. قد تتطلب بعض الخدمات مراجعة قبل التفعيل، ولا تعني الترقية ضمان الطلبات أو المبيعات.'
            : 'Sourced directly from admin settings. Some services may require review before activation; upgrading does not guarantee leads or sales.'}
        </p>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-card">
        <table className="w-full text-xs sm:text-sm">
          <thead>
            <tr className="bg-muted/30">
              <th className="text-start p-3 font-heading font-semibold text-muted-foreground min-w-[200px]">
                {isRTL ? 'النظام' : 'Module'}
              </th>
              {plans.map((p) => (
                <th key={p.id} className="p-3 font-heading font-semibold text-center min-w-[110px]">
                  {isRTL ? (p.name_ar ?? p.tier) : (p.name_en ?? p.tier)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grouped.map(([groupKey, rows]) => (
              <React.Fragment key={groupKey}>
                <tr className="bg-muted/15">
                  <td
                    colSpan={plans.length + 1}
                    className="p-2.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground"
                  >
                    {isRTL ? GROUP_LABELS[groupKey].ar : GROUP_LABELS[groupKey].en}
                  </td>
                </tr>
                {rows.map((m) => (
                  <tr key={m.module_key} className="border-t border-border/30">
                    <td className="p-3 font-medium text-foreground/80">
                      <div className="flex items-center gap-2">
                        {m.is_core && <Lock className="w-3 h-3 text-muted-foreground" aria-hidden />}
                        <span>{isRTL ? m.label_ar : m.label_en}</span>
                      </div>
                    </td>
                    {plans.map((p) => {
                      const on = m.is_core || getEnabled(p.id, m.module_key);
                      return (
                        <td key={p.id} className="p-3 text-center">
                          {on ? (
                            <Check className="w-4 h-4 text-success mx-auto" aria-label={isRTL ? 'متضمَّن' : 'Included'} />
                          ) : (
                            <Minus className="w-4 h-4 text-muted-foreground/40 mx-auto" aria-label={isRTL ? 'غير متضمَّن' : 'Not included'} />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default MembershipPlanModuleMatrix;