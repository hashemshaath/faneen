import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/i18n/LanguageContext';
import {
  formatQuotaExceededMessage,
  getQuotaExceededMetric,
  getQuotaUpgradeHint,
  isQuotaExceededError,
  type QuotaMetric,
} from '@/lib/quotaErrors';

interface Props {
  error?: unknown;
  metric?: QuotaMetric | null;
  className?: string;
  upgradeHref?: string;
}

/**
 * M2 — Inline alert card shown in creation flows when a server-side quota
 * trigger blocks the write. Parent renders it when
 * `isQuotaExceededError(mutation.error)` is true.
 */
export const QuotaExceededInline: React.FC<Props> = ({
  error,
  metric,
  className,
  upgradeHref = '/dashboard/membership',
}) => {
  const { isRTL } = useLanguage();
  const resolved: QuotaMetric | null = metric ?? getQuotaExceededMetric(error) ?? null;
  if (!resolved && error !== undefined && !isQuotaExceededError(error)) return null;
  if (!resolved && error === undefined) return null;

  return (
    <div
      role="alert"
      className={cn(
        'rounded-xl border border-destructive/40 bg-destructive/5 text-destructive',
        'px-3 py-2.5 flex flex-wrap items-center gap-2 text-xs',
        className,
      )}
    >
      <AlertTriangle className="w-4 h-4 shrink-0" />
      <div className="flex-1 min-w-0 leading-relaxed">
        <p className="font-medium">{formatQuotaExceededMessage(resolved, isRTL)}</p>
        <p className="text-[10.5px] opacity-80 mt-0.5">{getQuotaUpgradeHint(isRTL)}</p>
      </div>
      <Link to={upgradeHref} className="shrink-0">
        <Button size="sm" variant="destructive" className="h-7 text-[11px] gap-1">
          <ArrowUpRight className="w-3 h-3" />
          {isRTL ? 'ترقية العضوية' : 'Upgrade membership'}
        </Button>
      </Link>
    </div>
  );
};

export default QuotaExceededInline;