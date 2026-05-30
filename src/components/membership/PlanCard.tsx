import React from 'react';
import { Button } from '@/components/ui/button';
import { Check, X, Loader2, Send, ArrowDownCircle, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LIMIT_FIELDS, parseLimits, type LimitField } from '@/lib/membership-limits';

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
  const price = billingCycle === 'monthly' ? plan.price_monthly : plan.price_yearly;
  const isPremium = plan.tier === 'premium' || featured;
  const monthlyEq = billingCycle === 'yearly' && plan.price_yearly > 0 ? Math.round(plan.price_yearly / 12) : null;
  const savingPct = (plan.price_monthly > 0 && plan.price_yearly > 0)
    ? Math.round((1 - plan.price_yearly / (plan.price_monthly * 12)) * 100)
    : 0;

  // Top features to surface inline (max 5). Derived from the canonical
  // LIMIT_FIELDS so admin + cards stay in sync.
  const parsedLimits = React.useMemo(
    () => parseLimits(plan.limits as Record<string, unknown> | undefined),
    [plan.limits],
  );
  const TOP_KEYS = [
    'max_featured_ads',
    'search_priority',
    'homepage_visibility',
    'profile_badge',
    'max_projects',
  ];
  const topFields: LimitField[] = TOP_KEYS
    .map((k) => LIMIT_FIELDS.find((f) => f.key === k))
    .filter((f): f is LimitField => !!f);

  const renderFeatureValue = (field: LimitField): { on: boolean; label: string } => {
    const v = parsedLimits[field.key];
    if (field.type === 'boolean') {
      return { on: !!v, label: field.label[isRTL ? 'ar' : 'en'] };
    }
    const n = typeof v === 'number' ? v : Number(v ?? 0);
    const unlimited = field.key.startsWith('max_') && n === 0;
    const baseLabel = field.label[isRTL ? 'ar' : 'en'];
    if (unlimited) {
      return { on: true, label: `${baseLabel} — ${isRTL ? 'غير محدود' : 'Unlimited'}` };
    }
    if (n === 0) return { on: false, label: baseLabel };
    return { on: true, label: `${n} ${baseLabel}` };
  };

  return (
    <div
      id={`plan-card-${plan.tier}`}
      data-plan-tier={plan.tier}
      className={cn(
        'relative rounded-2xl border bg-card flex flex-col p-7 sm:p-8 transition-all duration-300 scroll-mt-28 h-full',
        isPremium
          ? 'border-2 border-primary shadow-2xl shadow-primary/10 lg:scale-[1.02] z-10'
          : 'border-border hover:border-foreground/20 hover:shadow-lg hover-lift',
        isCurrentPlan && !isPremium && 'ring-2 ring-primary/40',
        highlighted && 'ring-4 ring-primary ring-offset-2 ring-offset-background animate-pulse',
        className,
      )}
    >
      {isPremium && (
        <div className="absolute -top-3.5 inset-x-0 flex justify-center pointer-events-none">
          <span className="inline-flex items-center gap-1 bg-primary text-primary-foreground text-[11px] font-bold uppercase tracking-wide px-4 py-1.5 rounded-full shadow-md">
            <Sparkles className="w-3 h-3" />{isRTL ? 'الأكثر طلباً' : 'Most Popular'}
          </span>
        </div>
      )}
      {isCurrentPlan && (
        <div className="absolute -top-3 end-4 z-10">
          <span className="inline-flex items-center gap-1 bg-success text-white text-[11px] font-bold px-2.5 py-1 rounded-full shadow-md">
            <Check className="w-3 h-3" />{isRTL ? 'خطتك' : 'Your Plan'}
          </span>
        </div>
      )}

      {/* Identity */}
      <div className="mb-7">
        <h3 className="font-heading font-bold text-xl text-foreground">
          {language === 'ar' ? plan.name_ar : plan.name_en}
        </h3>
        <p className="text-muted-foreground text-sm mt-2 leading-relaxed line-clamp-2 min-h-[2.5em]">
          {language === 'ar' ? plan.description_ar : plan.description_en}
        </p>
      </div>

      {/* Price */}
      <div className="mb-7">
        <div className={cn('flex items-baseline gap-2 flex-wrap', isPremium && 'text-primary')}>
          <span className="font-heading font-bold text-foreground tracking-tight text-4xl sm:text-5xl">
            {price === 0 ? (
              isRTL ? 'مجاناً' : 'Free'
            ) : (
              <span className="tech-content">{price.toLocaleString(isRTL ? 'ar-SA-u-nu-latn' : 'en-US')}</span>
            )}
          </span>
          {price > 0 && (
            <span className="text-muted-foreground text-sm">
              {isRTL ? 'ر.س' : 'SAR'} / {billingCycle === 'monthly' ? (isRTL ? 'شهر' : 'mo') : (isRTL ? 'سنة' : 'yr')}
            </span>
          )}
        </div>
        {monthlyEq && billingCycle === 'yearly' && savingPct > 0 && (
          <p className="text-[11px] text-muted-foreground mt-2">
            <span className="tech-content">≈ {monthlyEq.toLocaleString(isRTL ? 'ar-SA-u-nu-latn' : 'en-US')} {isRTL ? 'ر.س/شهر' : 'SAR/mo'}</span>
            {' · '}
            <span className="text-success font-semibold">−{savingPct}%</span>
          </p>
        )}
        {price === 0 && (
          <p className="text-[11px] text-muted-foreground mt-2">{isRTL ? 'بدون بطاقة ائتمان' : 'No credit card required'}</p>
        )}
      </div>

      {/* Features — vertical list, no tabs */}
      <ul className="space-y-3.5 mb-8 flex-1">
        {topFields.map((field) => {
          const { on, label } = renderFeatureValue(field);
          return (
            <li
              key={field.key}
              className={cn(
                'flex items-start gap-3 text-sm leading-snug',
                on ? 'text-foreground/85' : 'text-muted-foreground/60 line-through',
              )}
            >
              {on ? (
                <Check className={cn('w-4 h-4 mt-0.5 shrink-0', isPremium ? 'text-primary' : 'text-success')} />
              ) : (
                <X className="w-4 h-4 mt-0.5 shrink-0 opacity-60" />
              )}
              <span>{label}</span>
            </li>
          );
        })}
      </ul>

      {/* CTA */}
      <Button
        onClick={() => onSubscribe(plan)}
        variant={isPremium ? 'default' : isCurrentPlan ? 'outline' : 'outline'}
        size="lg"
        className={cn(
          'w-full gap-1.5 font-semibold rounded-xl h-12',
          isPremium && 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20',
        )}
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
        <p className="text-[10px] text-center text-muted-foreground mt-3">
          {isRTL ? '✓ بدون التزام · إلغاء في أي وقت' : '✓ No commitment · Cancel anytime'}
        </p>
      )}
    </div>
  );
});

PlanCard.displayName = 'PlanCard';
