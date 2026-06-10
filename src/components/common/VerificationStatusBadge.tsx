import { memo } from 'react';
import { Link } from 'react-router-dom';
import { Info, UserCheck } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import { cn } from '@/lib/utils';
import { VerifiedBadge } from './VerifiedBadge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

type Size = 'xs' | 'sm' | 'md';

interface VerificationStatusBadgeProps {
  /** Source-of-truth verification flag (e.g. `business.is_verified`). */
  isVerified: boolean | null | undefined;
  size?: Size;
  /** When true and unverified, render the unverified pill as a CTA link. */
  ownerView?: boolean;
  /** Where the owner is sent to start the verification flow. */
  requestHref?: string;
  /** Hide the unverified pill entirely (e.g. dense card grids). */
  hideWhenUnverified?: boolean;
  /** Business id used to build the public claim CTA (`/claim/:id`). */
  businessId?: string | null;
  className?: string;
}

const sizeStyles: Record<Size, { wrap: string; icon: string }> = {
  xs: { wrap: 'px-1.5 py-0 h-4 text-[9px] gap-1', icon: 'w-2.5 h-2.5' },
  sm: { wrap: 'px-2 py-0.5 text-[10px] gap-1', icon: 'w-3 h-3' },
  md: { wrap: 'px-2.5 py-1 text-xs gap-1.5', icon: 'w-3.5 h-3.5' },
};

/**
 * Verification status with a guaranteed-honest fallback:
 *  - `is_verified === true` → green VerifiedBadge.
 *  - Otherwise → neutral "غير موثّقة بعد" pill. For the workshop owner the
 *    pill becomes a CTA link to start the verification flow.
 *
 * Use this whenever you would otherwise render `{biz.is_verified && <VerifiedBadge/>}`,
 * so unverified workshops get a valid alternative instead of silently hiding.
 */
export const VerificationStatusBadge = memo(({
  isVerified,
  size = 'sm',
  ownerView = false,
  requestHref = '/dashboard/badge',
  hideWhenUnverified = false,
  businessId,
  className,
}: VerificationStatusBadgeProps) => {
  const { language, isRTL } = useLanguage();
  const styles = sizeStyles[size];

  if (isVerified === true) {
    return <VerifiedBadge size={size} className={className} />;
  }
  if (hideWhenUnverified) return null;

  // Owner: keep the legacy "Request verification" CTA pointing at the
  // dashboard flow. Public visitors: surface a "Claim this business" CTA
  // (مطالبة بالحساب) plus an info tooltip with help text.
  const ownerLabel = isRTL ? 'اطلب التوثيق' : 'Request verification';
  const claimLabel = isRTL ? 'مطالبة بالحساب' : 'Claim this business';
  const helpText = isRTL
    ? 'إذا كانت هذه جهتك، يمكنك المطالبة بالحساب لإثبات ملكيتها وإدارة بياناتها. سنطلب وثائق تثبت العلاقة قبل اعتماد الملكية.'
    : 'If this is your business, claim the account to prove ownership and manage its data. We will ask for documents to verify the relationship before approval.';

  const pillClass = cn(
    'inline-flex items-center rounded-md font-body font-semibold border bg-muted text-muted-foreground border-border transition-colors',
    styles.wrap,
    'hover:bg-accent hover:text-accent-foreground cursor-pointer',
    className,
  );

  if (ownerView) {
    return (
      <Link to={requestHref} className={pillClass} lang={language} aria-label={ownerLabel}>
        <UserCheck className={styles.icon} />
        {ownerLabel}
      </Link>
    );
  }

  if (!businessId) {
    // Without a business id we cannot build the claim link — render nothing
    // rather than a dead pill.
    return null;
  }

  return (
    <span className="inline-flex items-center gap-1">
      <Link
        to={`/claim/${businessId}`}
        className={pillClass}
        lang={language}
        aria-label={claimLabel}
        data-testid="business-claim-cta"
      >
        <UserCheck className={styles.icon} />
        {claimLabel}
      </Link>
      <TooltipProvider delayDuration={150}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              aria-label={isRTL ? 'معلومات عن المطالبة بالحساب' : 'About claiming the account'}
              className="inline-flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <Info className="h-3.5 w-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-[260px] text-xs leading-relaxed">
            {helpText}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </span>
  );
});

VerificationStatusBadge.displayName = 'VerificationStatusBadge';

export default VerificationStatusBadge;