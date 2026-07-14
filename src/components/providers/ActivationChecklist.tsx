/**
 * F1.3 — Activation Checklist card.
 *
 * Renders the 5-step matcher-aligned checklist. When `variant="strip"`
 * and the provider is fully active, collapses to a small green strip
 * instead of the full card. Bilingual (AR/EN) and RTL-safe.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, ArrowLeft, ArrowRight, ListChecks, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useLanguage } from '@/i18n/LanguageContext';
import { useProviderActivation } from '@/hooks/useProviderActivation';

interface Props {
  businessId: string | null | undefined;
  /**
   * `card` (default): full checklist card.
   * `strip`: renders a compact green strip when fully active, otherwise the full card.
   * `hide-when-active`: renders nothing when fully active (used in leads inbox empty state).
   */
  variant?: 'card' | 'strip' | 'hide-when-active';
  emptyStateLine?: { ar: string; en: string };
}

export const ActivationChecklist: React.FC<Props> = ({
  businessId,
  variant = 'card',
  emptyStateLine,
}) => {
  const { isRTL } = useLanguage();
  const { data, isLoading } = useProviderActivation({ businessId });
  const Arrow = isRTL ? ArrowLeft : ArrowRight;

  if (!businessId || isLoading || !data) return null;

  const { steps, completedCount, totalCount, percent, isFullyActive } = data;

  if (isFullyActive && variant === 'hide-when-active') return null;

  if (isFullyActive && variant === 'strip') {
    return (
      <div
        className="flex items-center gap-2 rounded-lg border border-success/30 bg-success/5 px-3 py-2 text-sm text-success"
        data-testid="activation-strip-active"
      >
        <CheckCircle2 className="h-4 w-4" aria-hidden />
        <span className="font-medium">
          {isRTL ? 'حسابك مفعّل' : 'Your account is active'}
        </span>
      </div>
    );
  }

  const headlineAr = isFullyActive
    ? 'حسابك مكتمل ويستقبل الطلبات ✅'
    : 'أكمل الخطوات لتصلك طلبات عروض الأسعار';
  const headlineEn = isFullyActive
    ? 'Your account is complete and receiving requests ✅'
    : 'Complete the steps to start receiving quote requests';

  return (
    <Card data-testid="activation-checklist" className="border-primary/20">
      <CardContent className="p-4 sm:p-5 space-y-4">
        <div className="flex items-start gap-3">
          <div
            className={`shrink-0 rounded-lg p-2 ${
              isFullyActive ? 'bg-success/10 text-success' : 'bg-primary/10 text-primary'
            }`}
          >
            {isFullyActive ? (
              <CheckCircle2 className="h-5 w-5" aria-hidden />
            ) : (
              <ListChecks className="h-5 w-5" aria-hidden />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm sm:text-base font-heading font-bold text-foreground flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-gold" aria-hidden />
              {isRTL ? 'تفعيل حسابك' : 'Activate your account'}
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              {isRTL ? headlineAr : headlineEn}
            </p>
            {emptyStateLine && !isFullyActive && (
              <p className="text-xs text-primary mt-1 font-medium">
                {isRTL ? emptyStateLine.ar : emptyStateLine.en}
              </p>
            )}
          </div>
          <div className="shrink-0 text-end">
            <div className="text-lg font-heading font-bold tech-content">{percent}%</div>
            <div className="text-[10px] text-muted-foreground">
              {completedCount}/{totalCount}
            </div>
          </div>
        </div>

        <Progress value={percent} className="h-1.5" />

        <ul className="space-y-1.5" data-testid="activation-steps">
          {steps.map((s) => {
            const label = isRTL ? s.labelAr : s.labelEn;
            const hint = isRTL ? s.hintAr : s.hintEn;
            return (
              <li
                key={s.key}
                data-step-key={s.key}
                data-step-done={s.done ? 'true' : 'false'}
                className={`flex items-start gap-2.5 rounded-md border px-2.5 py-2 transition-colors ${
                  s.done
                    ? 'border-success/30 bg-success/5'
                    : 'border-border bg-muted/30 hover:bg-muted/60'
                }`}
              >
                <div className="mt-0.5 shrink-0">
                  {s.done ? (
                    <CheckCircle2 className="h-4 w-4 text-success" aria-hidden />
                  ) : (
                    <span className="inline-block h-4 w-4 rounded-full border-2 border-muted-foreground/40" aria-hidden />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm ${s.done ? 'text-muted-foreground line-through' : 'font-medium text-foreground'}`}>
                    {label}
                  </div>
                  {hint && (
                    <div className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                      {hint}
                    </div>
                  )}
                </div>
                {!s.done && (
                  <Link
                    to={s.href}
                    className="shrink-0 inline-flex items-center gap-1 rounded-md bg-primary/10 hover:bg-primary/20 text-primary text-[11px] font-medium px-2 py-1 min-h-[32px]"
                    aria-label={label}
                  >
                    {isRTL ? 'إكمال' : 'Complete'}
                    <Arrow className="h-3 w-3" aria-hidden />
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
};

export default ActivationChecklist;