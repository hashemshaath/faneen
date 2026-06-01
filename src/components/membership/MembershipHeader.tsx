import { cn } from '@/lib/utils';
import { useEffect, useMemo } from 'react';

interface MembershipHeaderProps {
  isRTL: boolean;
  billingCycle: 'monthly' | 'yearly';
  setBillingCycle: (cycle: 'monthly' | 'yearly') => void;
  plans?: Array<{ price_monthly: number | null; price_yearly: number | null }>;
}

/**
 * MEMBERSHIP-PAGE-REDESIGN-2: This component now renders ONLY the
 * billing-cycle toggle. The previous hero block (badge + h1 + subtitle)
 * moved to `MembershipHero.tsx` so the page has a single semantic H1
 * and the spec-mandated CTAs ("قارن العضويات" / "تواصل معنا").
 */
export const MembershipHeader = ({ isRTL, billingCycle, setBillingCycle, plans = [] }: MembershipHeaderProps) => {
  const savingsPct = useMemo(() => {
    const paid = plans.filter(p => Number(p.price_monthly ?? 0) > 0 && Number(p.price_yearly ?? 0) > 0);
    if (paid.length === 0) return 0;
    const totalSaving = paid.reduce(
      (sum, p) => sum + (1 - Number(p.price_yearly) / (Number(p.price_monthly) * 12)),
      0,
    );
    return Math.round((totalSaving / paid.length) * 100);
  }, [plans]);

  // PRICING-SOURCE-OF-TRUTH-1: only render the yearly toggle when at least one
  // active plan has a confirmed positive yearly price. Otherwise the toggle
  // would let users select a cycle no plan supports.
  const yearlyAvailable = useMemo(
    () => plans.some((p) => Number(p.price_yearly ?? 0) > 0),
    [plans],
  );

  // If yearly disappears while it was selected, snap back to monthly.
  useEffect(() => {
    if (!yearlyAvailable && billingCycle === 'yearly') {
      setBillingCycle('monthly');
    }
  }, [yearlyAvailable, billingCycle, setBillingCycle]);

  return (
    <div className="flex items-center justify-center mb-8 sm:mb-10">
        <div className="relative inline-flex bg-muted/50 p-1 rounded-xl border border-border">
          <button
            onClick={() => setBillingCycle('monthly')}
            className={cn(
              'px-6 sm:px-8 py-2.5 text-sm font-semibold rounded-lg transition-all',
              billingCycle === 'monthly'
                ? 'bg-card text-foreground shadow-sm ring-1 ring-border'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {isRTL ? 'شهري' : 'Monthly'}
          </button>
          {yearlyAvailable && (
            <button
              onClick={() => setBillingCycle('yearly')}
              className={cn(
                'px-6 sm:px-8 py-2.5 text-sm font-semibold rounded-lg transition-all',
                billingCycle === 'yearly'
                  ? 'bg-card text-foreground shadow-sm ring-1 ring-border'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {isRTL ? 'سنوي' : 'Yearly'}
            </button>
          )}
          {yearlyAvailable && savingsPct > 0 && (
            <span
              className={cn(
                'absolute -top-3 bg-accent text-accent-foreground text-[10px] font-bold px-2 py-0.5 rounded-full ring-4 ring-background whitespace-nowrap',
                isRTL ? '-start-3' : '-end-3',
              )}
            >
              {isRTL ? `وفّر ${savingsPct}%` : `Save ${savingsPct}%`}
            </span>
          )}
        </div>
    </div>
  );
};
