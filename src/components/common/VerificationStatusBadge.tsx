import { memo } from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import { cn } from '@/lib/utils';
import { VerifiedBadge } from './VerifiedBadge';

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
  className,
}: VerificationStatusBadgeProps) => {
  const { language, isRTL } = useLanguage();
  const styles = sizeStyles[size];

  if (isVerified === true) {
    return <VerifiedBadge size={size} className={className} />;
  }
  if (hideWhenUnverified) return null;

  const label = isRTL
    ? (ownerView ? 'اطلب التوثيق' : 'غير موثّقة بعد')
    : (ownerView ? 'Request verification' : 'Not verified');

  const pillClass = cn(
    'inline-flex items-center rounded-md font-body font-semibold border bg-muted text-muted-foreground border-border',
    styles.wrap,
    ownerView && 'hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer',
    className,
  );

  const inner = (
    <>
      <ShieldAlert className={styles.icon} />
      {label}
    </>
  );

  if (ownerView) {
    return (
      <Link to={requestHref} className={pillClass} lang={language} aria-label={label}>
        {inner}
      </Link>
    );
  }
  return (
    <span className={pillClass} lang={language} aria-label={label} title={label}>
      {inner}
    </span>
  );
});

VerificationStatusBadge.displayName = 'VerificationStatusBadge';

export default VerificationStatusBadge;