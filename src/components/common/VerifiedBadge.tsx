import { memo } from 'react';
import { BadgeCheck } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import { cn } from '@/lib/utils';

/**
 * Unified "Verified" badge used across the app — Twitter/X style.
 * Visual contract:
 *  - Twitter-blue color (#1D9BF0)
 *  - BadgeCheck icon (scalloped badge with check, X-style)
 *  - ICON ONLY — no text label anywhere; accessible name via aria-label.
 *
 * Size scale:
 *  - xs (lists/cards), sm (default), md (profile header)
 */

type Size = 'xs' | 'sm' | 'md';

interface VerifiedBadgeProps {
  size?: Size;
  /** Deprecated — kept for API compatibility. Badge is always icon-only. */
  iconOnly?: boolean;
  className?: string;
}

const iconSize: Record<Size, string> = {
  xs: 'w-3.5 h-3.5',
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
};

export const VerifiedBadge = memo(({ size = 'sm', className }: VerifiedBadgeProps) => {
  const { isRTL } = useLanguage();
  const label = isRTL ? 'موثقة' : 'Verified';
  return (
    <BadgeCheck
      aria-label={label}
      title={label}
      className={cn(
        'shrink-0 text-[#1D9BF0] dark:text-[#1D9BF0] fill-[#1D9BF0]/15',
        iconSize[size],
        className,
      )}
    />
  );
});

VerifiedBadge.displayName = 'VerifiedBadge';

export default VerifiedBadge;