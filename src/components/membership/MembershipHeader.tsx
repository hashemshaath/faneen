import { Badge } from '@/components/ui/badge';
import { Sparkles, ShieldCheck, Building2, Headset, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMemo } from 'react';

interface MembershipHeaderProps {
  isRTL: boolean;
  billingCycle: 'monthly' | 'yearly';
  setBillingCycle: (cycle: 'monthly' | 'yearly') => void;
  plans?: Array<{ price_monthly: number; price_yearly: number }>;
}

export const MembershipHeader = ({ isRTL, billingCycle, setBillingCycle, plans = [] }: MembershipHeaderProps) => {
  // Calculate average yearly savings from actual plan prices
  const savingsPct = useMemo(() => {
    const paid = plans.filter(p => p.price_monthly > 0 && p.price_yearly > 0);
    if (paid.length === 0) return 0;
    const totalSaving = paid.reduce((sum, p) => sum + (1 - p.price_yearly / (p.price_monthly * 12)), 0);
    return Math.round((totalSaving / paid.length) * 100);
  }, [plans]);

  return (
    <div className="relative mb-10 sm:mb-16">
      {/* Decorative gradient mesh background */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 start-1/4 w-72 h-72 rounded-full bg-accent/10 blur-3xl" />
        <div className="absolute top-10 end-1/4 w-72 h-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -top-8 inset-x-0 h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent" />
      </div>

      <div className="text-center max-w-3xl mx-auto pt-2">
        <Badge variant="secondary" className="mb-4 bg-accent/10 text-accent border border-accent/20 gap-1.5 px-3 py-1 animate-fade-in">
          <Sparkles className="w-3 h-3" />{isRTL ? 'خطط العضوية الاحترافية' : 'Professional Membership Plans'}
        </Badge>
        <h1 className="font-heading font-bold text-3xl sm:text-5xl md:text-6xl text-foreground mb-4 leading-tight tracking-tight">
          {isRTL ? (
            <>اختر الباقة <span className="bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">الأنسب لنمو</span> أعمالك</>
          ) : (
            <>Pick the plan that <span className="bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">grows your business</span></>
          )}
        </h1>
        <p className="text-muted-foreground text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
          {isRTL
            ? 'ابدأ مجاناً، وارفع باقتك في أي وقت. مزايا حصرية، دعم مخصص، وحلول مصمّمة لقطاعات الصناعة.'
            : 'Start free and upgrade anytime. Exclusive features, dedicated support, and tools built for industrial sectors.'}
        </p>

        {/* Trust strip */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[11px] sm:text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-success" />{isRTL ? 'دفع آمن ومحمي' : 'Secure & protected'}</span>
          <span className="hidden sm:inline opacity-30">•</span>
          <span className="inline-flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-accent" />{isRTL ? 'تفعيل فوري' : 'Instant activation'}</span>
          <span className="hidden sm:inline opacity-30">•</span>
          <span className="inline-flex items-center gap-1.5"><Headset className="w-3.5 h-3.5 text-primary" />{isRTL ? 'دعم متخصص' : 'Dedicated support'}</span>
          <span className="hidden sm:inline opacity-30">•</span>
          <span className="inline-flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5 text-info" />{isRTL ? 'موثوق من المنشآت' : 'Trusted by businesses'}</span>
        </div>

        {/* Billing cycle toggle */}
        <div className="relative inline-flex items-center gap-1 mt-8 bg-card border border-border/60 shadow-sm rounded-full p-1">
          <button onClick={() => setBillingCycle('monthly')}
            className={cn('px-5 py-2 rounded-full text-xs sm:text-sm font-medium transition-all',
              billingCycle === 'monthly' ? 'bg-foreground text-background shadow-md' : 'text-muted-foreground hover:text-foreground')}>
            {isRTL ? 'شهري' : 'Monthly'}
          </button>
          <button onClick={() => setBillingCycle('yearly')}
            className={cn('px-5 py-2 rounded-full text-xs sm:text-sm font-medium transition-all inline-flex items-center gap-2',
              billingCycle === 'yearly' ? 'bg-foreground text-background shadow-md' : 'text-muted-foreground hover:text-foreground')}>
            {isRTL ? 'سنوي' : 'Yearly'}
            {savingsPct > 0 && (
              <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-semibold',
                billingCycle === 'yearly' ? 'bg-success/20 text-success' : 'bg-success/15 text-success')}>
                −{savingsPct}%
              </span>
            )}
          </button>
        </div>
        {savingsPct > 0 && billingCycle === 'monthly' && (
          <p className="text-[11px] text-muted-foreground mt-2">
            {isRTL ? `💡 وفّر حتى ${savingsPct}% بالاشتراك السنوي` : `💡 Save up to ${savingsPct}% with yearly billing`}
          </p>
        )}
      </div>
    </div>
  );
};
