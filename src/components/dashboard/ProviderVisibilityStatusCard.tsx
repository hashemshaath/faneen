import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, Clock, ArrowLeft, ArrowRight, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/i18n/LanguageContext';
import { useProviderReadiness, type ApprovalStatus } from '@/hooks/useProviderReadiness';

/**
 * Phase B3 — Provider Public Visibility status card.
 *
 * Presentational summary that reads existing `useProviderReadiness` state
 * (no new queries, no mutations) and renders ONE of three messages:
 *   - visible (public + approved/published)
 *   - pending review (submitted / under_review)
 *   - not visible yet
 *
 * Does NOT change readiness calculation or public visibility logic — it
 * only re-presents the current state to the provider.
 */

type Tone = 'success' | 'info' | 'warn';

const TONE: Record<Tone, { ring: string; bg: string; fg: string; icon: string }> = {
  success: {
    ring: 'border-success/30',
    bg: 'bg-success/5',
    fg: 'text-success',
    icon: 'bg-success/15 text-success',
  },
  info: {
    ring: 'border-info/30',
    bg: 'bg-info/5',
    fg: 'text-info',
    icon: 'bg-info/15 text-info',
  },
  warn: {
    ring: 'border-warning/30',
    bg: 'bg-warning/5',
    fg: 'text-warning',
    icon: 'bg-warning/15 text-warning',
  },
};

function resolveState(
  status: ApprovalStatus | null | undefined,
  isPublic: boolean,
  isRTL: boolean,
): { tone: Tone; icon: LucideIcon; title: string; message: string } {
  // Pending review (submitted / under_review)
  if (status === 'submitted' || status === 'under_review') {
    return {
      tone: 'info',
      icon: Clock,
      title: isRTL ? 'بانتظار المراجعة' : 'Pending review',
      message: isRTL
        ? 'ملفك بانتظار مراجعة فريق قطاعات.'
        : 'Your profile is pending review by the Qitaat team.',
    };
  }
  // Visible (public + approved/published)
  if (isPublic && (status === 'approved' || status === 'published')) {
    return {
      tone: 'success',
      icon: Eye,
      title: isRTL ? 'ظاهر للعملاء' : 'Visible to customers',
      message: isRTL
        ? 'ملفك ظاهر الآن للعملاء.'
        : 'Your profile is now visible to customers.',
    };
  }
  // Default: not visible yet (draft / needs_changes / rejected / approved-but-not-public)
  return {
    tone: 'warn',
    icon: EyeOff,
    title: isRTL ? 'غير ظاهر بعد' : 'Not visible yet',
    message: isRTL
      ? 'ملفك غير ظاهر للعامة حتى يكتمل الحد الأدنى ويتم اعتماده.'
      : 'Your profile is not public yet — complete the basics and get approved first.',
  };
}

export interface ProviderVisibilityStatusCardProps {
  className?: string;
}

export const ProviderVisibilityStatusCard: React.FC<ProviderVisibilityStatusCardProps> = ({
  className,
}) => {
  const { user } = useAuth();
  const { isRTL } = useLanguage();
  const { status, isPublic, business } = useProviderReadiness(user?.id);
  const Arrow = isRTL ? ArrowLeft : ArrowRight;

  // Auto-hide when there is no business linked yet (matches ReadinessCard behavior).
  if (!business) return null;

  const state = resolveState(status, isPublic, isRTL);
  const t = TONE[state.tone];
  const Icon = state.icon;

  return (
    <Card
      className={cn('border', t.ring, t.bg, className)}
      data-testid="provider-visibility-status-card"
      data-state={state.tone}
      aria-label={state.title}
    >
      <CardContent className="p-4 flex items-start gap-3">
        <span
          className={cn('shrink-0 w-9 h-9 rounded-lg flex items-center justify-center', t.icon)}
          aria-hidden="true"
        >
          <Icon className="w-4 h-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className={cn('text-xs font-semibold', t.fg)}>{state.title}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
            {state.message}
          </p>
        </div>
        <Button asChild size="sm" variant="outline" className="h-8 gap-1 text-[11px] shrink-0">
          <Link to="/dashboard/business-visibility">
            {isRTL ? 'تفاصيل الظهور' : 'Visibility details'}
            <Arrow className="w-3.5 h-3.5" aria-hidden="true" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
};

ProviderVisibilityStatusCard.displayName = 'ProviderVisibilityStatusCard';