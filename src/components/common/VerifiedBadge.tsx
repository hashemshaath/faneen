import { memo } from 'react';
import { ShieldCheck } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import { cn } from '@/lib/utils';

/**
 * Unified "Verified" badge used across the app.
 * Visual contract (saqf-style):
 *  - emerald color tokens
 *  - ShieldCheck icon (NEVER BadgeCheck / CheckCircle2 / ✓ glyph)
 *  - Arabic label "شركة موثقة" (or "موثقة" in compact size), English "Verified"
 *
 * Variants:
 *  - size: 'xs' (compact chip for cards/lists), 'sm' (default), 'md' (profile header)
 *  - iconOnly: render only the icon (e.g. inline next to a title)
 */

type Size = 'xs' | 'sm' | 'md';

interface VerifiedBadgeProps {
  size?: Size;
  iconOnly?: boolean;
  className?: string;
}

const sizeStyles: Record<Size, { wrap: string; icon: string }> = {
  xs: { wrap: 'px-1.5 py-0 h-4 text-[9px] gap-1', icon: 'w-2.5 h-2.5' },
  sm: { wrap: 'px-2 py-0.5 text-[10px] gap-1', icon: 'w-3 h-3' },
  md: { wrap: 'px-2.5 py-1 text-xs gap-1.5', icon: 'w-3.5 h-3.5' },
};

export const VerifiedBadge = memo(({ size = 'sm', iconOnly = false, className }: VerifiedBadgeProps) => {
  const { language, isRTL } = useLanguage();
  const styles = sizeStyles[size];
  const label = isRTL
    ? (size === 'md' ? 'شركة موثقة' : 'موثقة')
    : 'Verified';

  if (iconOnly) {
    return (
      <ShieldCheck
        aria-label={label}
        className={cn('text-success dark:text-success shrink-0', styles.icon, className)}
      />
    );
  }

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md font-body font-semibold border bg-success/10 text-success dark:text-success border-success/20',
        styles.wrap,
        className,
      )}
      lang={language}
    >
      <ShieldCheck className={styles.icon} />
      {label}
    </span>
  );
});

VerifiedBadge.displayName = 'VerifiedBadge';

export default VerifiedBadge;