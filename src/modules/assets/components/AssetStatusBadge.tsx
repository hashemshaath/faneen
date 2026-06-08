import React from 'react';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/i18n/LanguageContext';
import { ASSET_STATUS_LABELS, ASSET_STATUS_TONE } from '../constants';
import type { AssetStatus } from '../types';

const TONE_CLASS: Record<string, string> = {
  success: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300',
  info: 'bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300',
  warning: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300',
  danger: 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300',
  neutral: 'bg-muted text-muted-foreground border-border',
};

export const AssetStatusBadge: React.FC<{ status: AssetStatus }> = ({ status }) => {
  const { isRTL } = useLanguage();
  const label = ASSET_STATUS_LABELS[status];
  return (
    <Badge variant="outline" className={TONE_CLASS[ASSET_STATUS_TONE[status]] ?? TONE_CLASS.neutral}>
      {isRTL ? label.ar : label.en}
    </Badge>
  );
};

export default AssetStatusBadge;