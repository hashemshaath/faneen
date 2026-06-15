import React from 'react';
import { Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/i18n/LanguageContext';

/**
 * AUTH-14B · Free-Launch plan badge for the provider dashboard hero.
 * Pure presentation — does NOT grant, fetch, or mutate membership state.
 * The membership tier is resolved by the caller from existing queries.
 */
export const FreeLaunchBadge: React.FC<{ tier?: string | null }> = ({ tier }) => {
  const { isRTL } = useLanguage();
  const isFreeLaunch = (tier ?? '').toLowerCase() === 'free_launch';

  return (
    <Badge
      data-testid="provider-free-launch-badge"
      variant="outline"
      className="h-6 px-2 text-[10px] gap-1 border-success/30 bg-success/5 text-success"
    >
      <Sparkles className="w-3 h-3" aria-hidden />
      {isFreeLaunch
        ? (isRTL ? 'خطة الإطلاق المجانية مفعّلة' : 'Free Launch plan active')
        : (isRTL ? 'خطة الإطلاق المجانية متاحة' : 'Free Launch plan available')}
    </Badge>
  );
};

export default FreeLaunchBadge;