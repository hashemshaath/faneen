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
  // AUTH-14E · Treat both the modern `free_launch` tier and the DB-mirrored
  // legacy `free` tier as the same active soft-launch plan, matching what
  // the activation pipeline stamps on the business row.
  // Pure presentation — no grant/fetch/mutate.
  const normalized = (tier ?? '').toLowerCase();
  const isFreeLaunch = normalized === 'free_launch' || normalized === 'free';

  const activeLabel = isRTL ? 'خطة الإطلاق المجانية مفعّلة' : 'Free Launch plan active';
  const availableLabel = isRTL
    ? 'خطة الإطلاق المجانية متاحة للمزودين المؤهلين بعد تفعيل المنشأة'
    : 'Free Launch plan available to eligible providers once their business is activated';
  const noChargeNote = isRTL
    ? 'لا يتم احتساب أي رسوم خلال مرحلة الإطلاق التجريبي.'
    : 'No charges are applied during the soft-launch phase.';

  return (
    <Badge
      data-testid="provider-free-launch-badge"
      data-free-launch-state={isFreeLaunch ? 'active' : 'available'}
      variant="outline"
      title={`${isFreeLaunch ? activeLabel : availableLabel} — ${noChargeNote}`}
      aria-label={`${isFreeLaunch ? activeLabel : availableLabel}. ${noChargeNote}`}
      className="h-6 px-2 text-[10px] gap-1 border-success/30 bg-success/5 text-success"
    >
      <Sparkles className="w-3 h-3" aria-hidden />
      <span>{isFreeLaunch ? activeLabel : availableLabel}</span>
      <span className="sr-only">{noChargeNote}</span>
    </Badge>
  );
};

export default FreeLaunchBadge;