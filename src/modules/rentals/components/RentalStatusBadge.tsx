import React from 'react';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/i18n/LanguageContext';
import { ORDER_STATUS_LABELS, ORDER_STATUS_TONES } from '../constants';
import type { RentalOrderStatus } from '../types';

const TONE_CLASS: Record<string, string> = {
  primary: 'bg-primary/10 text-primary border-primary/30',
  amber: 'bg-amber-500/10 text-amber-700 border-amber-500/30 dark:text-amber-300',
  red: 'bg-red-500/10 text-red-700 border-red-500/30 dark:text-red-300',
  emerald: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30 dark:text-emerald-300',
  muted: 'bg-muted text-muted-foreground border-border',
};

export const RentalStatusBadge: React.FC<{ status: RentalOrderStatus }> = ({ status }) => {
  const { isRTL } = useLanguage();
  const label = ORDER_STATUS_LABELS[status];
  const tone = ORDER_STATUS_TONES[status];
  return (
    <Badge variant="outline" className={`rounded-full ${TONE_CLASS[tone]}`}>
      {isRTL ? label.ar : label.en}
    </Badge>
  );
};