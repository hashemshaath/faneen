import { cn } from '@/lib/utils';
import { useMemo } from 'react';

interface MembershipHeaderProps {
  isRTL: boolean;
  billingCycle: 'monthly' | 'yearly';
  setBillingCycle: (cycle: 'monthly' | 'yearly') => void;
  plans?: Array<{ price_monthly: number; price_yearly: number }>;
}

export const MembershipHeader = ({ isRTL, billingCycle, setBillingCycle, plans = [] }: MembershipHeaderProps) => {
  const savingsPct = useMemo(() => {
    const paid = plans.filter(p => p.price_monthly > 0 && p.price_yearly > 0);
    if (paid.length === 0) return 0;
    const totalSaving = paid.reduce((sum, p) => sum + (1 - p.price_yearly / (p.price_monthly * 12)), 0);
    return Math.round((totalSaving / paid.length) * 100);
  }, [plans]);

  return (
    <div className="text-center max-w-3xl mx-auto pt-2 mb-12 sm:mb-16 space-y-6">
      <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs sm:text-sm font-medium">
        <span className="flex h-2 w-2 rounded-full bg-primary" />
        {isRTL ? 'خطط العضوية الاحترافية' : 'Professional Membership Plans'}
      </div>

      <h1 className="font-heading font-bold text-3xl sm:text-5xl md:text-[3.25rem] text-foreground leading-tight tracking-tight">
        {isRTL ? (
          <>اختر الباقة الأنسب <span className="text-primary">لنمو أعمالك</span></>
        ) : (
          <>Pick the plan that <span className="text-primary">grows your business</span></>
        )}
      </h1>

      <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
        {isRTL
          ? 'ابدأ مجاناً، وارفع باقتك في أي وقت. مزايا حصرية، دعم مخصص، وحلول مصمّمة لقطاعات الصناعة.'
          : 'Start free and upgrade anytime. Exclusive features, dedicated support, and tools built for industrial sectors.'}
      </p>

      {/* Billing cycle toggle */}
      <div className="flex items-center justify-center pt-4">
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
    </div>
  );
};
