import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Sparkles, ArrowUp, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { tierIcons, tierGradients } from '@/lib/membership-tiers';

interface PlanCardProps {
  plan: any;
  billingCycle: 'monthly' | 'yearly';
  isRTL: boolean;
  language: string;
  isCurrentPlan: boolean;
  isUpgrade: boolean;
  isDowngrade: boolean;
  isSubscribing: boolean;
  onSubscribe: (plan: any) => void;
}

export const PlanCard = React.memo(({
  plan, billingCycle, isRTL, language, isCurrentPlan, isUpgrade, isDowngrade, isSubscribing, onSubscribe,
}: PlanCardProps) => {
  const Icon = tierIcons[plan.tier] || Zap;
  const gradient = tierGradients[plan.tier] || tierGradients.free;
  const price = billingCycle === 'monthly' ? plan.price_monthly : plan.price_yearly;
  const features = Array.isArray(plan.features) ? plan.features : [];
  const isPremium = plan.tier === 'premium';

  return (
    <div className={cn(
      'relative rounded-2xl border p-5 flex flex-col transition-all duration-300 hover:shadow-lg group',
      isPremium ? 'border-accent bg-accent/5 dark:bg-accent/10 shadow-md md:scale-[1.03]' : 'border-border bg-card',
      isCurrentPlan && 'ring-2 ring-accent/30'
    )}>
      {isPremium && (
        <div className="absolute -top-3 inset-x-0 flex justify-center">
          <Badge className="bg-accent text-accent-foreground shadow-lg gap-1">
            <Sparkles className="w-3 h-3" />{isRTL ? 'الأكثر طلباً' : 'Most Popular'}
          </Badge>
        </div>
      )}
      {isCurrentPlan && (
        <div className="absolute -top-3 end-4">
          <Badge className="bg-emerald-500 text-white shadow-lg gap-1">
            <Check className="w-3 h-3" />{isRTL ? 'خطتك' : 'Your Plan'}
          </Badge>
        </div>
      )}

      <div className={cn('w-11 h-11 rounded-xl bg-gradient-to-br flex items-center justify-center mb-4', gradient)}>
        <Icon className="w-5 h-5 text-white" />
      </div>

      <h3 className="font-heading font-bold text-lg mb-1">
        {language === 'ar' ? plan.name_ar : plan.name_en}
      </h3>
      <p className="text-[10px] text-muted-foreground mb-4 line-clamp-2">
        {language === 'ar' ? plan.description_ar : plan.description_en}
      </p>

      <div className="mb-5">
        <span className="font-heading font-bold text-2xl sm:text-3xl text-foreground">
          {price === 0 ? (isRTL ? 'مجاناً' : 'Free') : price}
        </span>
        {price > 0 && (
          <span className="text-xs text-muted-foreground ms-1">
            {isRTL ? 'ر.س' : 'SAR'}/{billingCycle === 'monthly' ? (isRTL ? 'شهر' : 'mo') : (isRTL ? 'سنة' : 'yr')}
          </span>
        )}
      </div>

      <ul className="space-y-2 mb-6 flex-1">
        {features.map((feat: string, i: number) => (
          <li key={i} className="flex items-start gap-2 text-xs">
            <div className="w-4 h-4 rounded-full bg-accent/10 flex items-center justify-center shrink-0 mt-0.5">
              <Check className="w-2.5 h-2.5 text-accent" />
            </div>
            <span className="text-foreground/80">{feat}</span>
          </li>
        ))}
      </ul>

      <Button
        onClick={() => onSubscribe(plan)}
        variant={isPremium ? 'hero' : isCurrentPlan ? 'outline' : 'default'}
        className={cn('w-full gap-1.5 transition-all', isUpgrade && !isCurrentPlan && 'bg-accent text-accent-foreground hover:bg-accent/90')}
        disabled={!!isCurrentPlan || isSubscribing}
      >
        {isSubscribing ? (
          <><Loader2 className="w-3.5 h-3.5 animate-spin" />{isRTL ? 'جارٍ التفعيل...' : 'Activating...'}</>
        ) : isCurrentPlan ? (
          <><Check className="w-3.5 h-3.5" />{isRTL ? 'خطتك الحالية' : 'Current Plan'}</>
        ) : isUpgrade ? (
          <><ArrowUp className="w-3.5 h-3.5" />{isRTL ? 'ترقية الآن' : 'Upgrade Now'}</>
        ) : isDowngrade ? (
          <>{isRTL ? 'تخفيض' : 'Downgrade'}</>
        ) : (
          <>{isRTL ? 'اشترك الآن' : 'Subscribe Now'}</>
        )}
      </Button>
    </div>
  );
});

PlanCard.displayName = 'PlanCard';
