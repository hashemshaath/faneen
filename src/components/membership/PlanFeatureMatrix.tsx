import React from 'react';
import { Check, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { listActiveMembershipPlans } from '@/modules/memberships';
import { cn } from '@/lib/utils';
import {
  LIMIT_FIELDS,
  LIMIT_CATEGORIES,
  parseLimits,
  getPlanLimitDisplayValue,
} from '@/lib/membership-limits';
import { TIERS, tierIcons } from '@/lib/membership-tiers';

const tierLabels: Record<string, { ar: string; en: string }> = {
  free: { ar: 'مجاني', en: 'Free' },
  basic: { ar: 'أساسي', en: 'Basic' },
  premium: { ar: 'مميز', en: 'Premium' },
  enterprise: { ar: 'مؤسسي', en: 'Enterprise' },
};

interface PlanFeatureMatrixProps {
  isRTL: boolean;
  /** When provided, only these tiers are shown (in order). Defaults to all TIERS. */
  tiers?: readonly string[];
  /** Highlight a specific tier column (defaults to 'premium'). */
  highlightTier?: string;
  /** Optional caption rendered above the table. */
  caption?: React.ReactNode;
  className?: string;
  /**
   * When true, render every declared LIMIT_FIELDS row including unconfirmed ones
   * (admin editor / internal previews). Defaults to `false` so PUBLIC surfaces
   * never advertise invented numeric limits.
   */
  includeUnconfirmed?: boolean;
}

/**
 * Centralized, reusable plan feature matrix.
 * - Reads active membership_plans from DB.
 * - Generates rows from LIMIT_FIELDS, grouped by LIMIT_CATEGORIES.
 * - No hardcoded plan names/prices.
 */
export const PlanFeatureMatrix: React.FC<PlanFeatureMatrixProps> = ({
  isRTL,
  tiers = TIERS,
  highlightTier = 'premium',
  caption,
  className,
  includeUnconfirmed = false,
}) => {
  const { data: plans = [] } = useQuery({
    queryKey: ['membership-plans-comparison'],
    queryFn: async () => {
      const { data } = await listActiveMembershipPlans<{
        tier: string;
        limits: unknown;
      }>({ select: 'tier, limits' });
      return data ?? [];
    },
  });

  const planLimits = React.useMemo(() => {
    const map: Record<string, Record<string, number | boolean>> = {};
    for (const tier of tiers) {
      const plan = plans.find((p) => p.tier === tier);
      map[tier] = parseLimits(plan?.limits as Record<string, unknown> | undefined);
    }
    return map;
  }, [plans, tiers]);

  return (
    <div className={cn('w-full', className)}>
      {caption}
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-xs sm:text-sm">
          <thead>
            <tr className="bg-muted/30">
              <th className="text-start p-3 font-heading font-semibold text-muted-foreground min-w-[160px]">
                {isRTL ? 'الميزة' : 'Feature'}
              </th>
              {tiers.map((tier) => {
                const Icon = tierIcons[tier];
                const label = tierLabels[tier] ?? { ar: tier, en: tier };
                return (
                  <th
                    key={tier}
                    className={cn(
                      'p-3 font-heading font-semibold text-center min-w-[90px]',
                      tier === highlightTier && 'bg-accent/10 text-accent',
                    )}
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      {Icon && <Icon className="w-3.5 h-3.5" />}
                      {isRTL ? label.ar : label.en}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {LIMIT_CATEGORIES.map((cat) => {
              const catFields = LIMIT_FIELDS.filter(
                (f) => f.category === cat.key && (includeUnconfirmed || f.confirmed),
              );
              if (catFields.length === 0) return null;
              return (
                <React.Fragment key={cat.key}>
                  <tr className="bg-muted/15">
                    <td
                      colSpan={tiers.length + 1}
                      className="p-2.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground"
                    >
                      {isRTL ? cat.label.ar : cat.label.en}
                    </td>
                  </tr>
                  {catFields.map((field) => (
                    <tr
                      key={field.key}
                      className="border-t border-border/30 hover:bg-muted/10 transition-colors"
                    >
                      <td className="p-3 font-medium text-foreground/80">
                        {isRTL ? field.label.ar : field.label.en}
                      </td>
                      {tiers.map((tier) => {
                        const display = getPlanLimitDisplayValue(field, planLimits[tier]?.[field.key]);
                        return (
                          <td
                            key={tier}
                            className={cn(
                              'p-3 text-center',
                              tier === highlightTier && 'bg-accent/5',
                            )}
                          >
                            {display.kind === 'bool' ? (
                              display.on ? (
                                <Check className="w-4 h-4 text-success mx-auto" />
                              ) : (
                                <X className="w-4 h-4 text-muted-foreground/30 mx-auto" />
                              )
                            ) : (
                              <span className="font-semibold text-foreground tech-content">
                                {display.text}
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PlanFeatureMatrix;