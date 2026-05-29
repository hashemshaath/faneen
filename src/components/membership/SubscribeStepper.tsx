import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft, ArrowRight, Building2, Check, Loader2, Lock,
  Send, ShieldCheck, Sparkles, Undo2, AlertTriangle, ArrowDownCircle, CreditCard,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PlanFeatureTabs } from './PlanFeatureTabs';
import { PromoCodeRedeem } from './PromoCodeRedeem';

type Mode = 'upgrade' | 'downgrade';

export interface StepperPlan {
  id: string;
  tier: string;
  name_ar: string | null;
  name_en: string | null;
  price_monthly: number;
  price_yearly: number;
  limits?: unknown;
}

export interface StepperBusiness {
  id: string;
  ref_id?: string | null;
  name_ar?: string | null;
  name_en?: string | null;
}

interface SubscribeStepperProps {
  mode: Mode;
  plan: StepperPlan;
  business: StepperBusiness;
  billingCycle: 'monthly' | 'yearly';
  setBillingCycle: (c: 'monthly' | 'yearly') => void;
  isRTL: boolean;
  isSubmitting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Inline 2-step subscription flow (no popups/dialogs).
 * - Step 1: review business + plan + billing cycle (+ optional promo)
 * - Step 2: payment / activation summary with single primary CTA
 */
export const SubscribeStepper: React.FC<SubscribeStepperProps> = ({
  mode, plan, business, billingCycle, setBillingCycle,
  isRTL, isSubmitting, onConfirm, onCancel,
}) => {
  const [step, setStep] = React.useState<1 | 2>(1);

  React.useEffect(() => {
    // Scroll the stepper into view when it mounts (mobile/long pages).
    requestAnimationFrame(() => {
      document.getElementById('subscribe-stepper')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, []);

  const price = billingCycle === 'monthly' ? plan.price_monthly : plan.price_yearly;
  const monthlyEq = billingCycle === 'yearly' && plan.price_yearly > 0 ? Math.round(plan.price_yearly / 12) : null;
  const savingPct = (plan.price_monthly > 0 && plan.price_yearly > 0)
    ? Math.round((1 - plan.price_yearly / (plan.price_monthly * 12)) * 100)
    : 0;
  const planLabel = (isRTL ? plan.name_ar : plan.name_en) || plan.tier;
  const businessName = (isRTL ? business.name_ar : business.name_en) || business.name_ar || business.name_en || (isRTL ? 'منشأتك' : 'Your business');
  // VAT 15% inclusive — show breakdown for transparency only.
  const vatBase = Math.round((price / 1.15) * 100) / 100;
  const vatAmount = Math.round((price - vatBase) * 100) / 100;

  const fmt = (n: number) => n.toLocaleString(isRTL ? 'ar-SA-u-nu-latn' : 'en-US', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 });

  return (
    <section
      id="subscribe-stepper"
      aria-label={isRTL ? 'إكمال الاشتراك' : 'Complete subscription'}
      className="max-w-4xl mx-auto mb-8 rounded-2xl border border-accent/30 bg-gradient-to-b from-card to-accent/5 shadow-[0_10px_40px_-20px_hsl(var(--accent)/0.35)] overflow-hidden"
    >
      {/* Stepper header */}
      <header className="px-5 sm:px-7 py-4 border-b border-border/60 bg-background/40 backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-accent/15 text-accent flex items-center justify-center shrink-0">
              {mode === 'upgrade' ? <Sparkles className="w-4 h-4" /> : <ArrowDownCircle className="w-4 h-4" />}
            </div>
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                {mode === 'upgrade' ? (isRTL ? 'ترقية الباقة' : 'Plan upgrade') : (isRTL ? 'تغيير الباقة' : 'Change plan')}
              </p>
              <h3 className="font-heading font-bold text-base sm:text-lg text-foreground truncate">
                {isRTL ? `الاشتراك في باقة ${planLabel}` : `Subscribe to ${planLabel}`}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="shrink-0 text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 px-2 py-1 rounded-md hover:bg-muted/50"
            aria-label={isRTL ? 'إلغاء' : 'Cancel'}
          >
            <Undo2 className="w-3.5 h-3.5" />
            {isRTL ? 'إلغاء' : 'Cancel'}
          </button>
        </div>

        {/* Steps indicator */}
        <ol className="mt-4 flex items-center gap-2" aria-label={isRTL ? 'خطوات الاشتراك' : 'Subscription steps'}>
          {[1, 2].map((n) => {
            const isActive = step === n;
            const isDone = step > n;
            return (
              <li key={n} className="flex items-center gap-2 flex-1">
                <div className={cn(
                  'w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold transition-all',
                  isDone ? 'bg-success text-white' : isActive ? 'bg-accent text-accent-foreground shadow' : 'bg-muted text-muted-foreground',
                )}>
                  {isDone ? <Check className="w-3.5 h-3.5" /> : <span className="tech-content">{n}</span>}
                </div>
                <span className={cn('text-[12px] font-medium', isActive ? 'text-foreground' : 'text-muted-foreground')}>
                  {n === 1 ? (isRTL ? 'المراجعة' : 'Review') : (isRTL ? 'الدفع والتأكيد' : 'Pay & confirm')}
                </span>
                {n === 1 && <div className="flex-1 h-px bg-border/60 mx-1" />}
              </li>
            );
          })}
        </ol>
      </header>

      {/* Step body */}
      <div className="p-5 sm:p-7 space-y-5">
        {step === 1 && (
          <div className="space-y-5">
            {/* Business binding */}
            <div className="rounded-xl border border-border/60 bg-background/60 p-4">
              <div className="flex items-start gap-3">
                <Building2 className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
                    {isRTL ? 'مرتبطة بالمنشأة' : 'Bound to business'}
                  </p>
                  <p className="font-semibold text-foreground truncate" dir="auto">{businessName}</p>
                  {business.ref_id && (
                    <p className="text-[11px] mt-0.5">
                      <span className="text-muted-foreground me-1.5">{isRTL ? 'الرقم المرجعي:' : 'Reference:'}</span>
                      <span className="tech-content font-mono font-semibold text-foreground">{business.ref_id}</span>
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Billing cycle (only when paid plan) */}
            {plan.price_monthly > 0 && (
              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
                  {isRTL ? 'دورة الفوترة' : 'Billing cycle'}
                </p>
                <div role="radiogroup" className="inline-flex rounded-xl border border-border/60 bg-background/60 p-1 gap-1">
                  {(['monthly', 'yearly'] as const).map((c) => {
                    const isActive = billingCycle === c;
                    return (
                      <button
                        key={c}
                        type="button"
                        role="radio"
                        aria-checked={isActive}
                        onClick={() => setBillingCycle(c)}
                        className={cn(
                          'px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all',
                          isActive ? 'bg-accent text-accent-foreground shadow' : 'text-muted-foreground hover:text-foreground',
                        )}
                      >
                        {c === 'monthly' ? (isRTL ? 'شهري' : 'Monthly') : (isRTL ? 'سنوي' : 'Yearly')}
                        {c === 'yearly' && savingPct > 0 && (
                          <span className={cn('ms-1.5 text-[10px] px-1.5 py-0.5 rounded-full font-bold', isActive ? 'bg-white/20 text-white' : 'bg-success/15 text-success')}>
                            −{savingPct}%
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Plan summary preview */}
            <div className="rounded-xl border border-accent/20 bg-accent/5 p-4">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-3">
                {isRTL ? 'ما تحصل عليه' : 'What you get'}
              </p>
              <PlanFeatureTabs limits={plan.limits} isRTL={isRTL} emphasized />
            </div>

            {/* Promo */}
            {plan.price_monthly > 0 && (
              <PromoCodeRedeem isRTL={isRTL} businessId={business.id} />
            )}

            {/* Navigation */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/40">
              <p className="text-[11px] text-muted-foreground inline-flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-success" />
                {isRTL ? 'دفع آمن — حماية كاملة للبيانات' : 'Secure payment — full data protection'}
              </p>
              <Button
                size="lg"
                onClick={() => setStep(2)}
                className="gap-1.5 font-semibold"
              >
                {isRTL ? 'متابعة' : 'Continue'}
                {isRTL ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            {/* Order summary */}
            <div className="rounded-xl border border-border/60 bg-background/60 p-4 sm:p-5">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-3">
                {isRTL ? 'ملخص الطلب' : 'Order summary'}
              </p>
              <dl className="space-y-2 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-muted-foreground">{isRTL ? 'الباقة' : 'Plan'}</dt>
                  <dd className="font-semibold text-foreground capitalize">{planLabel}</dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-muted-foreground">{isRTL ? 'الدورة' : 'Cycle'}</dt>
                  <dd className="text-foreground">{billingCycle === 'yearly' ? (isRTL ? 'سنوي' : 'Yearly') : (isRTL ? 'شهري' : 'Monthly')}</dd>
                </div>
                {price > 0 && (
                  <>
                    <div className="flex items-center justify-between gap-2">
                      <dt className="text-muted-foreground">{isRTL ? 'السعر قبل الضريبة' : 'Subtotal (ex-VAT)'}</dt>
                      <dd className="tech-content text-foreground">{fmt(vatBase)} {isRTL ? 'ر.س' : 'SAR'}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <dt className="text-muted-foreground">{isRTL ? 'ضريبة القيمة المضافة (15%)' : 'VAT (15%)'}</dt>
                      <dd className="tech-content text-foreground">{fmt(vatAmount)} {isRTL ? 'ر.س' : 'SAR'}</dd>
                    </div>
                  </>
                )}
                <div className="flex items-center justify-between gap-2 pt-2 mt-2 border-t border-border/60">
                  <dt className="font-semibold text-foreground">{isRTL ? 'الإجمالي' : 'Total'}</dt>
                  <dd className="font-bold text-lg text-foreground tech-content">
                    {price === 0 ? (isRTL ? 'مجاناً' : 'Free') : `${fmt(price)} ${isRTL ? 'ر.س' : 'SAR'}`}
                  </dd>
                </div>
                {monthlyEq && billingCycle === 'yearly' && (
                  <p className="text-[11px] text-muted-foreground text-end">
                    ≈ <span className="tech-content">{fmt(monthlyEq)}</span> {isRTL ? 'ر.س/شهر' : 'SAR/mo'}
                  </p>
                )}
              </dl>
            </div>

            {/* Downgrade warning */}
            {mode === 'downgrade' && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 flex items-start gap-2.5 text-sm">
                <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                <p className="text-foreground/85 leading-relaxed">
                  {plan.tier === 'free'
                    ? (isRTL ? 'سيتم تطبيق الانتقال للباقة المجانية فوراً، وسيتم تقليل بعض المزايا.' : 'Switching to Free is applied immediately and reduces some benefits.')
                    : (isRTL ? 'سيتم تطبيق التغيير فوراً وقد يقلل بعض الحدود المتاحة.' : 'The change applies immediately and may reduce some limits.')}
                </p>
              </div>
            )}

            {/* CTAs */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/40">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStep(1)}
                disabled={isSubmitting}
                className="gap-1.5"
              >
                {isRTL ? <ArrowRight className="w-3.5 h-3.5" /> : <ArrowLeft className="w-3.5 h-3.5" />}
                {isRTL ? 'رجوع' : 'Back'}
              </Button>
              <Button
                size="lg"
                variant={mode === 'downgrade' ? 'destructive' : 'hero'}
                onClick={onConfirm}
                disabled={isSubmitting || (mode === 'upgrade' && !business.ref_id)}
                className="gap-1.5 font-semibold"
              >
                {isSubmitting ? (
                  <><Loader2 className="w-4 h-4 animate-spin" />{isRTL ? 'جارٍ المعالجة...' : 'Processing...'}</>
                ) : mode === 'downgrade' ? (
                  <><Check className="w-4 h-4" />{isRTL ? 'تأكيد التغيير' : 'Confirm change'}</>
                ) : price === 0 ? (
                  <><Send className="w-4 h-4" />{isRTL ? 'تفعيل الباقة' : 'Activate plan'}</>
                ) : (
                  <><CreditCard className="w-4 h-4" />{isRTL ? 'المتابعة للدفع الآمن' : 'Continue to secure payment'}</>
                )}
              </Button>
            </div>
            {price > 0 && mode !== 'downgrade' && (
              <p className="text-[11px] text-muted-foreground inline-flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" />
                {isRTL ? 'سيتم تحويلك إلى صفحة الدفع الآمنة عبر مُيسّر.' : 'You will be redirected to the secure Moyasar checkout.'}
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
};

SubscribeStepper.displayName = 'SubscribeStepper';