/**
 * Presentational chip for membership tier display.
 * Pure UI — does NOT modify lib/membership-tiers or lib/membership-limits.
 * Uses semantic tokens only — no hardcoded hex colors.
 */
import React from 'react';
import { cn } from '@/lib/utils';

export type TierValue =
  | 'free'
  | 'basic'
  | 'growth'
  | 'pro'
  | 'premium'
  | 'enterprise'
  | 'legacy'
  | 'unknown'
  | (string & {});

const TIER_LABEL_AR: Record<string, string> = {
  free: 'مجانية',
  basic: 'أساسية',
  growth: 'النمو',
  pro: 'احترافية',
  premium: 'بريميوم',
  enterprise: 'مؤسسية',
  legacy: 'سابقة',
  unknown: 'غير محدد',
};

const TIER_LABEL_EN: Record<string, string> = {
  free: 'Free',
  basic: 'Basic',
  growth: 'Growth',
  pro: 'Pro',
  premium: 'Premium',
  enterprise: 'Enterprise',
  legacy: 'Legacy',
  unknown: 'Unknown',
};

export interface TierChipProps {
  tier: TierValue | null | undefined;
  isRTL?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export const TierChip: React.FC<TierChipProps> = ({ tier, isRTL = true, size = 'sm', className }) => {
  const value = (tier ?? 'free') as string;
  const isFree = value === 'free' || value === 'unknown';
  const label = (isRTL ? TIER_LABEL_AR[value] : TIER_LABEL_EN[value]) ?? value;
  const sizeCls = size === 'md' ? 'text-xs px-2 py-1' : 'text-[10px] px-2 py-0.5';
  return (
    <span
      className={cn(
        'rounded-full border inline-flex items-center',
        sizeCls,
        isFree
          ? 'border-muted-foreground/30 bg-muted/30 text-muted-foreground'
          : 'border-success/40 bg-success/10 text-success',
        className,
      )}
    >
      {label}
    </span>
  );
};

export default TierChip;