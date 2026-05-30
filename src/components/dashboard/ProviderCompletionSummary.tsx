import { Link } from 'react-router-dom';
import { useMemo } from 'react';
import {
  AlertCircle, ArrowLeft, ArrowRight, CheckCircle2,
  ExternalLink, MessageSquareWarning, Send, ShieldAlert, ShieldCheck, Sparkles,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/i18n/LanguageContext';
import { useProviderReadiness } from '@/hooks/useProviderReadiness';

/**
 * Compact, dashboard-hero version of the readiness signal (P3).
 * Shows completion %, status, short guidance, top-3 missing fields,
 * and the single most relevant CTA. The detailed ProviderReadinessCard
 * still appears lower on the page.
 */
export function ProviderCompletionSummary() {
  const { user } = useAuth();
  const { language, isRTL } = useLanguage();
  const { business, missing, status, completion, isPublic, needsAttention, canSubmit } =
    useProviderReadiness(user?.id);

  const Arrow = isRTL ? ArrowLeft : ArrowRight;

  const cta = useMemo(() => {
    if (needsAttention) {
      return {
        label: language === 'ar' ? 'مراجعة الملاحظات' : 'Review feedback',
        to: '/dashboard/business-completion',
        variant: 'default' as const,
        icon: MessageSquareWarning,
      };
    }
    if (isPublic && business?.username) {
      return {
        label: language === 'ar' ? 'عرض صفحة المنشأة' : 'View public profile',
        to: `/${business.username}`,
        variant: 'outline' as const,
        icon: ExternalLink,
      };
    }
    if (canSubmit && completion >= 50 && missing.length === 0) {
      return {
        label: language === 'ar' ? 'إرسال للمراجعة' : 'Submit for review',
        to: '#submit-for-review',
        variant: 'default' as const,
        icon: Send,
      };
    }
    return {
      label: language === 'ar' ? 'إكمال الملف' : 'Complete profile',
      to: '/dashboard/business-completion',
      variant: 'default' as const,
      icon: Sparkles,
    };
  }, [needsAttention, isPublic, canSubmit, completion, missing.length, business?.username, language]);

  if (!user || !business) return null;

  const Icon = isPublic ? ShieldCheck : ShieldAlert;
  const tone = isPublic
    ? 'border-success/20 from-success/5'
    : needsAttention
      ? 'border-warning/30 from-warning/5'
      : 'border-accent/20 from-accent/5';

  // Smooth-scroll to the lower readiness card when CTA is the submit action.
  const onCtaClick = (e: React.MouseEvent) => {
    if (cta.to === '#submit-for-review') {
      e.preventDefault();
      document.getElementById('provider-readiness')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <Card className={`overflow-hidden border ${tone} bg-gradient-to-br to-card`} dir={isRTL ? 'rtl' : 'ltr'}>
      <CardContent className="p-4 sm:p-5 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Icon className={`h-5 w-5 shrink-0 ${isPublic ? 'text-success' : needsAttention ? 'text-warning' : 'text-accent'}`} />
            <div className="min-w-0">
              <div className="font-heading font-bold text-sm sm:text-base">
                {language === 'ar' ? 'اكتمال ملف المنشأة' : 'Profile completion'}
              </div>
              <p className="text-[11px] text-muted-foreground line-clamp-2">
                {language === 'ar'
                  ? 'كلما كان ملفك مكتملاً زادت فرص ظهورك واستقبال الطلبات.'
                  : 'A more complete profile means more visibility and more leads.'}
              </p>
            </div>
          </div>
          <Badge
            variant="outline"
            className={`tech-content text-sm font-bold shrink-0 px-2.5 h-7 border ${
              isPublic ? 'border-success/40 text-success bg-success/5'
                : needsAttention ? 'border-warning/40 text-warning bg-warning/5'
                : 'border-accent/40 text-accent bg-accent/5'
            }`}
            aria-label={`${language === 'ar' ? 'الاكتمال' : 'Completion'} ${completion}%`}
          >
            {completion}%
          </Badge>
        </div>

        <Progress
          value={completion}
          className={`h-2 ${isPublic ? '[&>div]:bg-success' : needsAttention ? '[&>div]:bg-warning' : '[&>div]:bg-accent'}`}
          aria-label={`${language === 'ar' ? 'الاكتمال' : 'Completion'} ${completion}%`}
        />

        {missing.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-muted-foreground">
              {language === 'ar' ? 'ينقص:' : 'Missing:'}
            </span>
            {missing.slice(0, 3).map((m) => (
              <Link
                key={m.key}
                to={m.href}
                className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-muted/40 px-2 py-0.5 text-[11px] hover:bg-muted transition-colors"
              >
                <AlertCircle className="h-3 w-3 text-warning" />
                {language === 'ar' ? m.ar : m.en}
              </Link>
            ))}
            {missing.length > 3 && (
              <span className="text-[11px] text-muted-foreground">
                +{missing.length - 3}
              </span>
            )}
          </div>
        )}

        {missing.length === 0 && isPublic && (
          <div className="flex items-center gap-1.5 text-[11px] text-success">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {language === 'ar' ? 'ملفك مكتمل ومنشور' : 'Profile complete and live'}
          </div>
        )}

        <div className="flex items-center justify-end">
          <Button asChild size="sm" variant={cta.variant} className="gap-1.5">
            <Link to={cta.to} onClick={onCtaClick}>
              <cta.icon className="h-3.5 w-3.5" />
              {cta.label}
              <Arrow className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}