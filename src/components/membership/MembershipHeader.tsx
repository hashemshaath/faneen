import { Badge } from '@/components/ui/badge';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MembershipHeaderProps {
  isRTL: boolean;
  billingCycle: 'monthly' | 'yearly';
  setBillingCycle: (cycle: 'monthly' | 'yearly') => void;
}

export const MembershipHeader = ({ isRTL, billingCycle, setBillingCycle }: MembershipHeaderProps) => (
  <div className="text-center mb-8 sm:mb-14 max-w-2xl mx-auto">
    <Badge variant="secondary" className="mb-3 bg-accent/10 text-accent gap-1">
      <Sparkles className="w-3 h-3" />{isRTL ? 'خطط العضوية' : 'Membership Plans'}
    </Badge>
    <h1 className="font-heading font-bold text-2xl sm:text-4xl md:text-5xl text-foreground mb-3">
      {isRTL ? 'اختر الخطة المناسبة لنمو أعمالك' : 'Choose the Right Plan for Growth'}
    </h1>
    <p className="text-muted-foreground text-xs sm:text-sm">
      {isRTL ? 'ابدأ مجاناً وقم بالترقية في أي وقت حسب احتياجاتك' : 'Start free and upgrade anytime based on your needs'}
    </p>

    <div className="flex items-center justify-center gap-1 mt-6 bg-muted/30 rounded-full p-0.5 w-fit mx-auto">
      <button onClick={() => setBillingCycle('monthly')}
        className={cn('px-4 py-1.5 rounded-full text-xs font-medium transition-all',
          billingCycle === 'monthly' ? 'bg-accent text-accent-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
        {isRTL ? 'شهري' : 'Monthly'}
      </button>
      <button onClick={() => setBillingCycle('yearly')}
        className={cn('px-4 py-1.5 rounded-full text-xs font-medium transition-all',
          billingCycle === 'yearly' ? 'bg-accent text-accent-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
        {isRTL ? 'سنوي' : 'Yearly'}
        <span className="ms-1 text-[10px] bg-emerald-500/15 text-emerald-600 px-1.5 py-0.5 rounded-full">
          {isRTL ? 'وفّر 17%' : 'Save 17%'}
        </span>
      </button>
    </div>
  </div>
);
