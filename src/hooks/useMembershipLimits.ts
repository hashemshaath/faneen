import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { listActiveMembershipPlans } from '@/modules/memberships';
import {
  LIMIT_FIELDS,
  LIMIT_CATEGORIES,
  parseLimits,
  formatLimitValue,
  getPlanLimitDisplayValue,
  type LimitField,
} from '@/lib/membership-limits';
import { TIERS, type TierKey } from '@/lib/membership-tiers';

export interface CategorizedLimits {
  category: (typeof LIMIT_CATEGORIES)[number];
  fields: Array<{
    field: LimitField;
    value: number | boolean;
    display: ReturnType<typeof getPlanLimitDisplayValue>;
    label: string;
    formatted: string;
  }>;
}

/**
 * Display-only hook that returns normalized limits + grouped category data
 * for a given plan/tier. Reads active membership_plans from DB.
 * Frontend-only — never enforces limits.
 */
export function useMembershipLimits(tierOrPlan: TierKey | string | null | undefined, isRTL: boolean) {
  const { data: plans = [] } = useQuery({
    queryKey: ['membership-plans-active'],
    queryFn: async () => {
      const { data } = await listActiveMembershipPlans<{
        id: string;
        tier: string;
        name_ar: string;
        name_en: string;
        limits: unknown;
      }>({ select: 'id, tier, name_ar, name_en, limits' });
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const result = useMemo(() => {
    const tier = (tierOrPlan ?? 'free') as string;
    const plan = plans.find((p) => p.tier === tier);
    const raw = (plan?.limits as Record<string, unknown> | undefined) ?? undefined;
    const limits = parseLimits(raw as Record<string, unknown> | undefined);

    const grouped: CategorizedLimits[] = LIMIT_CATEGORIES.map((category) => {
      const fields = LIMIT_FIELDS.filter((f) => f.category === category.key).map((field) => ({
        field,
        value: limits[field.key],
        display: getPlanLimitDisplayValue(field, limits[field.key]),
        label: isRTL ? field.label.ar : field.label.en,
        formatted: formatLimitValue(field, limits[field.key], isRTL),
      }));
      return { category, fields };
    });

    return { limits, grouped, plan };
  }, [plans, tierOrPlan, isRTL]);

  return { ...result, plans, tiers: TIERS };
}