import React from 'react';
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { LIMIT_FIELDS, parseLimits, LIMIT_CATEGORIES } from '@/lib/membership-limits';
import { TIERS, tierIcons, tierGradients } from '@/lib/membership-tiers';

const tierLabels = {
  free: { ar: 'مجاني', en: 'Free' },
  basic: { ar: 'أساسي', en: 'Basic' },
  premium: { ar: 'مميز', en: 'Premium' },
  enterprise: { ar: 'مؤسسي', en: 'Enterprise' },
};

interface FeatureComparisonTableProps {
  isRTL: boolean;
}

export const FeatureComparisonTable = ({ isRTL }: FeatureComparisonTableProps) => {
  const { data: plans = [] } = useQuery({
    queryKey: ['membership-plans-comparison'],
    queryFn: async () => {
      const { data } = await supabase.from('membership_plans').select('*').eq('is_active', true).order('sort_order');
      return data ?? [];
    },
  });

  // Build plan limits map keyed by tier
  const planLimits = React.useMemo(() => {
    const map: Record<string, Record<string, number | boolean>> = {};
    for (const tier of TIERS) {
      const plan = plans.find((p) => p.tier === tier);
      map[tier] = parseLimits(plan?.limits as Record<string, any> | undefined);
    }
    return map;
  }, [plans]);

  // Also include plan features (text list)
  const planFeatures = React.useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const tier of TIERS) {
      const plan = plans.find((p) => p.tier === tier);
      map[tier] = Array.isArray(plan?.features) ? plan.features as string[] : [];
    }
    return map;
  }, [plans]);

  return (
    <div className="max-w-5xl mx-auto mt-12 sm:mt-16">
      <h2 className="font-heading font-bold text-xl sm:text-2xl text-center mb-6">
        {isRTL ? 'مقارنة تفصيلية للمميزات' : 'Detailed Feature Comparison'}
      </h2>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-xs sm:text-sm">
          <thead>
            <tr className="bg-muted/30">
              <th className="text-start p-3 font-heading font-semibold text-muted-foreground min-w-[160px]">
                {isRTL ? 'الميزة' : 'Feature'}
              </th>
              {TIERS.map(tier => {
                const Icon = tierIcons[tier];
                return (
                  <th key={tier} className={cn(
                    'p-3 font-heading font-semibold text-center min-w-[90px]',
                    tier === 'premium' && 'bg-accent/10 text-accent'
                  )}>
                    <div className="flex items-center justify-center gap-1.5">
                      <Icon className="w-3.5 h-3.5" />
                      {isRTL ? tierLabels[tier].ar : tierLabels[tier].en}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {LIMIT_CATEGORIES.map(cat => {
              const catFields = LIMIT_FIELDS.filter(f => f.category === cat.key);
              if (catFields.length === 0) return null;
              return (
                <React.Fragment key={cat.key}>
                  {/* Category header */}
                  <tr className="bg-muted/15">
                    <td colSpan={5} className="p-2.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      {isRTL ? cat.label.ar : cat.label.en}
                    </td>
                  </tr>
                  {catFields.map(field => (
                    <tr key={field.key} className="border-t border-border/30 hover:bg-muted/10 transition-colors">
                      <td className="p-3 font-medium text-foreground/80">
                        {isRTL ? field.label.ar : field.label.en}
                      </td>
                      {TIERS.map(tier => {
                        const val = planLimits[tier]?.[field.key];
                        return (
                          <td key={tier} className={cn('p-3 text-center', tier === 'premium' && 'bg-accent/5')}>
                            {field.type === 'boolean' ? (
                              val ? (
                                <Check className="w-4 h-4 text-emerald-500 mx-auto" />
                              ) : (
                                <X className="w-4 h-4 text-muted-foreground/30 mx-auto" />
                              )
                            ) : (
                              <span className="font-semibold text-foreground">
                                {val === 0 ? (field.key.includes('max_') ? (isRTL ? '—' : '—') : '0') : val}
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
