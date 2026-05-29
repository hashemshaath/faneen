import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Sparkles, Loader2, Zap, Send, TrendingUp, ArrowDownCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { tierIcons, tierGradients } from '@/lib/membership-tiers';
import { PlanFeatureTabs } from './PlanFeatureTabs';

interface PlanCardPlan {
  id: string;
  tier: string;
  name_ar: string | null;
  name_en: string | null;
  description_ar: string | null;
  description_en: string | null;
  price_monthly: number;
  price_yearly: number;
  features?: unknown;
  limits?: unknown;
}

interface PlanCardProps {
  plan: PlanCardPlan;
  billingCycle: 'monthly' | 'yearly';
  isRTL: boolean;
  language: string;
  isCurrentPlan: boolean;
  isUpgrade: boolean;
  isDowngrade: boolean;
  isSubscribing: boolean;
  onSubscribe: (plan: { id: string; tier: string }) => void;
  featured?: boolean;
  className?: string;
  highlighted?: boolean;
}

export const PlanCard = React.memo(({
  plan, billingCycle, isRTL, language, isCurrentPlan, isUpgrade, isDowngrade, isSubscribing, onSubscribe,
  featured = false, className, highlighted = false,
}: PlanCardProps) => {
  const Icon = tierIcons[plan.tier] || Zap;
  const gradient = tierGradients[plan.tier] || tierGradients.free;
  const price = billingCycle === 'monthly' ? plan.price_monthly : plan.price_yearly;
  const isPremium = plan.tier === 'premium' || featured;
  const monthlyEq = billingCycle === 'yearly' && plan.price_yearly > 0 ? Math.round(plan.price_yearly / 12) : null;
  const savingPct = (plan.price_monthly > 0 && plan.price_yearly > 0)
    ? Math.round((1 - plan.price_yearly / (plan.price_monthly * 12)) * 100)
    : 0;

  return (
    <div
      id={`plan-card-${plan.tier}`}
      data-plan-tier={plan.tier}
      className={cn(
      'relative rounded-2xl border flex flex-col transition-all duration-300 hover-lift group overflow-hidden scroll-mt-28',
      featured ? 'p-6 sm:p-8' : 'p-5 sm:p-6',
      isPremium
        ? 'border-accent/40 bg-gradient-to-b from-accent/5 to-card shadow-[0_10px_40px_-15px_hsl(var(--accent)/0.4)]'
        : 'border-border/60 bg-card hover:border-accent/30 hover:shadow-lg',
      isCurrentPlan && 'ring-2 ring-accent/40 ring-offset-2 ring-offset-background',
      highlighted && 'ring-4 ring-accent ring-offset-2 ring-offset-background animate-pulse',
      className,
    )}>
      {isPremium && (
        <div aria-hidden className="absolute inset-0 -z-10 opacity-60">
          <div className="absolute -top-20 start-1/2 -translate-x-1/2 w-40 h-40 rounded-full bg-accent/20 blur-3xl" />
        </div>
      )}

      {isPremium && (
        <div className="absolute -top-3.5 inset-x-0 flex justify-center pointer-events-none">
          <Badge className="bg-gradient-to-r from-accent to-accent/80 text-accent-foreground shadow-lg gap-1 px-3 py-1 text-[11px] font-bold uppercase tracking-wide">
            <Sparkles className="w-3 h-3" />{isRTL ? 'الأكثر طلباً' : 'Most Popular'}
          </Badge>
        </div>
      )}
      {isCurrentPlan && (
        <div className="absolute -top-3 end-4 z-10">
          <Badge className="bg-success text-white shadow-lg gap-1 px-2.5">
            <Check className="w-3 h-3" />{isRTL ? 'خطتك' : 'Your Plan'}
          </Badge>
        </div>
      )}

      <div className={cn(
        'rounded-2xl bg-gradient-to-br flex items-center justify-center mb-4 shadow-md ring-1 ring-white/10 transition-transform group-hover:scale-110 group-hover:rotate-3',
        featured ? 'w-16 h-16' : 'w-12 h-12',
        gradient,
      )}>
        <Icon className={cn('text-white drop-shadow', featured ? 'w-8 h-8' : 'w-6 h-6')} />
      </div>

      <h3 className={cn('font-heading font-bold mb-1.5 text-foreground', featured ? 'text-2xl sm:text-3xl' : 'text-xl')}>
        {language === 'ar' ? plan.name_ar : plan.name_en}
      </h3>
      <p className={cn('text-muted-foreground mb-5 leading-relaxed', featured ? 'text-sm line-clamp-3 min-h-[3.6em]' : 'text-xs line-clamp-2 min-h-[2.4em]')}>
        {language === 'ar' ? plan.description_ar : plan.description_en}
      </p>

      <div className="mb-5 pb-5 border-b border-border/40">
        <div className="flex items-baseline gap-1.5 flex-wrap">
          <span className={cn('font-heading font-bold text-foreground tracking-tight', featured ? 'text-5xl sm:text-6xl' : 'text-3xl sm:text-4xl')}>
            {price === 0 ? (isRTL ? 'مجاناً' : 'Free') : (
              <span className="tech-content">{price.toLocaleString(isRTL ? 'ar-SA-u-nu-latn' : 'en-US')}</span>
            )}
          </span>
          {price > 0 && (
            <span className="text-xs text-muted-foreground">
              {isRTL ? 'ر.س' : 'SAR'} / {billingCycle === 'monthly' ? (isRTL ? 'شهر' : 'mo') : (isRTL ? 'سنة' : 'yr')}
            </span>
          )}
        </div>
        {monthlyEq && billingCycle === 'yearly' && (
          <p className="text-[11px] text-muted-foreground mt-1.5 inline-flex items-center gap-1.5">
            <span className="tech-content">≈ {monthlyEq.toLocaleString(isRTL ? 'ar-SA-u-nu-latn' : 'en-US')} {isRTL ? 'ر.س/شهر' : 'SAR/mo'}</span>
            {savingPct > 0 && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-success/10 text-success font-semibold">
                <TrendingUp className="w-2.5 h-2.5" />−{savingPct}%
              </span>
            )}
          </p>
        )}
        {price === 0 && (
          <p className="text-[11px] text-muted-foreground mt-1.5">{isRTL ? 'بدون بطاقة ائتمان' : 'No credit card required'}</p>
        )}
      </div>

      <div className="mb-6 flex-1">
        <PlanFeatureTabs limits={plan.limits} isRTL={isRTL} emphasized={isPremium} />
      </div>

      <Button
        onClick={() => onSubscribe(plan)}
        variant={isPremium ? 'hero' : isCurrentPlan ? 'outline' : 'default'}
        size="lg"
        className={cn('w-full gap-1.5 transition-all font-semibold', isUpgrade && !isCurrentPlan && !isPremium && 'bg-accent text-accent-foreground hover:bg-accent/90')}
        disabled={!!isCurrentPlan || isSubscribing}
      >
        {isSubscribing ? (
          <><Loader2 className="w-4 h-4 animate-spin" />{isRTL ? 'جارٍ التفعيل...' : 'Activating...'}</>
        ) : isCurrentPlan ? (
          <><Check className="w-4 h-4" />{isRTL ? 'خطتك الحالية' : 'Current Plan'}</>
        ) : isUpgrade ? (
          <><Send className="w-4 h-4" />{isRTL ? 'ترقية الآن' : 'Upgrade Now'}</>
        ) : isDowngrade ? (
          <><ArrowDownCircle className="w-4 h-4" />{isRTL ? 'الانتقال لهذه الباقة' : 'Switch to this plan'}</>
        ) : (
          <><Send className="w-4 h-4" />{isRTL ? 'ابدأ الآن' : 'Get Started'}</>
        )}
      </Button>

      {!isCurrentPlan && !isDowngrade && price > 0 && (
        <p className="text-[10px] text-center text-muted-foreground mt-2.5">
          {isRTL ? '✓ بدون التزام · إلغاء في أي وقت' : '✓ No commitment · Cancel anytime'}
        </p>
      )}
    </div>
  );
});

PlanCard.displayName = 'PlanCard';
