/**
 * Unified section header for the business onboarding wizard.
 *
 * Standardizes margins, icon container, title/description sizing across all
 * onboarding tabs (Identity / Classification / Address). Use instead of
 * ad-hoc `<header>` blocks so spacing and hierarchy stay consistent.
 */
import React from 'react';
import type { LucideIcon } from 'lucide-react';

export type SectionHeaderTone = 'emerald' | 'primary' | 'gold';

const TONE_CLASSES: Record<SectionHeaderTone, string> = {
  emerald: 'bg-emerald-500/10 text-emerald-600',
  primary: 'bg-primary/10 text-primary',
  gold: 'bg-gold/10 text-gold',
};

interface Props {
  icon: LucideIcon;
  title: React.ReactNode;
  description?: React.ReactNode;
  tone?: SectionHeaderTone;
  rightSlot?: React.ReactNode;
  size?: 'sm' | 'md';
  /** Show a small "Required" badge next to the title. */
  required?: boolean;
  /** Localized label for the required badge. Defaults to Arabic/English. */
  requiredLabel?: React.ReactNode;
}

export const OnboardingSectionHeader: React.FC<Props> = ({
  icon: Icon, title, description, tone = 'emerald', rightSlot, size = 'sm',
  required = false, requiredLabel,
}) => {
  const boxCls = size === 'md' ? 'w-9 h-9 rounded-xl' : 'w-7 h-7 rounded-lg';
  const iconCls = size === 'md' ? 'w-4 h-4' : 'w-3.5 h-3.5';
  const titleCls = size === 'md' ? 'text-sm font-bold' : 'text-xs font-bold';
  return (
    <header className="flex items-start justify-between gap-2">
      <div className="flex items-center gap-2 min-w-0">
        <div className={`${boxCls} ${TONE_CLASSES[tone]} flex items-center justify-center shrink-0`}>
          <Icon className={iconCls} />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <h3 className={`${titleCls} text-foreground leading-tight truncate`}>{title}</h3>
            {required && (
              <span
                className="shrink-0 inline-flex items-center gap-0.5 rounded-full bg-destructive/10 text-destructive border border-destructive/20 px-1.5 py-0.5 text-[9px] font-bold leading-none"
                aria-label="required"
              >
                <span className="text-destructive">*</span>
                {requiredLabel ?? 'إلزامي'}
              </span>
            )}
          </div>
          {description && (
            <p className="text-[10px] sm:text-[11px] text-muted-foreground leading-snug mt-0.5">
              {description}
            </p>
          )}
        </div>
      </div>
      {rightSlot && <div className="shrink-0">{rightSlot}</div>}
    </header>
  );
};

export default OnboardingSectionHeader;