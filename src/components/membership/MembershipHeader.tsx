import { cn } from '@/lib/utils';
import { useMemo } from 'react';

interface MembershipHeaderProps {
  isRTL: boolean;
  billingCycle: 'monthly' | 'yearly';
  setBillingCycle: (cycle: 'monthly' | 'yearly') => void;
  plans?: Array<{ price_monthly: number; price_yearly: number }>;
}

/**
 * MEMBERSHIP-PAGE-REDESIGN-2: This component now renders ONLY the
 * billing-cycle toggle. The previous hero block (badge + h1 + subtitle)
 * moved to `MembershipHero.tsx` so the page has a single semantic H1
 * and the spec-mandated CTAs ("قارن العضويات" / "تواصل معنا").
 */
export const MembershipHeader = ({ isRTL, billingCycle, setBillingCycle, plans = [] }: MembershipHeaderProps) => {
  const savingsPct = useMemo(() => {
    const paid = plans.filter(p => p.price_monthly > 0 && p.price_yearly > 0);
    if (paid.length === 0) return 0;
    const totalSaving = paid.reduce((sum, p) => sum + (1 - p.price_yearly / (p.price_monthly * 12)), 0);
    return Math.round((totalSaving / paid.length) * 100);
  }, [plans]);

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
          {savingsPct > 0 && (
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
