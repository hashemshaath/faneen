import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, SlidersHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getTimeGreeting } from './shared';

/**
 * Phase A — Unified Dashboard Hero.
 * Single Hero used by Admin / Provider / Customer overviews. Matches the
 * "صناعي هادئ" direction selected by the user: clean white card, title +
 * ref id chip + "last updated" line, Refresh + optional Customize action.
 */
export interface UnifiedDashboardHeroProps {
  isRTL: boolean;
  /** Role badge label, e.g. "لوحة مزود الخدمة" / "لوحة العميل" / "لوحة المسؤول". */
  roleLabel: { ar: string; en: string };
  /** User display name (optional). */
  fullName?: string | null;
  /** Reference id (USR-XXXXXXX / etc.) to render as a monospace chip. */
  refId?: string | null;
  /** Last-updated label (already localized). */
  lastUpdated?: string | null;
  /** Refresh action. */
  onRefresh: () => void;
  isRefreshing?: boolean;
  /** Optional customize toggle (User overview uses it). */
  onCustomize?: () => void;
  customizeActive?: boolean;
  /** Optional extra slot rendered on the actions row (e.g. tier badge). */
  rightSlot?: React.ReactNode;
  /** Optional subline (single line) under the title. */
  subline?: string | null;
}

export const UnifiedDashboardHero: React.FC<UnifiedDashboardHeroProps> = ({
  isRTL,
  roleLabel,
  fullName,
  refId,
  lastUpdated,
  onRefresh,
  isRefreshing,
  onCustomize,
  customizeActive,
  rightSlot,
  subline,
}) => {
  const greeting = getTimeGreeting(isRTL);
  const title = fullName ? `${greeting}، ${fullName}` : greeting;
  const role = isRTL ? roleLabel.ar : roleLabel.en;

  return (
    <section
      aria-label={role}
      className="rounded-2xl border border-border/60 bg-card p-5 sm:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4"
    >
      <div className="min-w-0">
        <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider rounded-full px-2.5 py-1 mb-2 bg-primary/8 text-primary border border-primary/15">
          <span className="w-1.5 h-1.5 rounded-full bg-primary" aria-hidden="true" />
          {role}
        </span>
        <h1 className="font-heading text-2xl sm:text-3xl font-bold leading-tight text-foreground truncate">
          {title}
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1.5 flex flex-wrap items-center gap-2">
          {refId && (
            <span className="inline-flex items-center gap-1.5">
              <span>{isRTL ? 'رقم المرجع:' : 'Ref ID:'}</span>
              <span className="tech-content font-mono font-medium text-foreground/80 bg-muted/60 px-2 py-0.5 rounded">
                {refId}
              </span>
            </span>
          )}
          {refId && lastUpdated && (
            <span className="h-1 w-1 rounded-full bg-border" aria-hidden="true" />
          )}
          {lastUpdated && <span>{lastUpdated}</span>}
          {subline && !refId && !lastUpdated && <span>{subline}</span>}
        </p>
        {subline && (refId || lastUpdated) && (
          <p className="text-xs text-muted-foreground/80 mt-1 truncate">{subline}</p>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0 flex-wrap">
        {rightSlot}
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={isRefreshing}
          aria-label={isRTL ? 'تحديث' : 'Refresh'}
          className="h-9 gap-1.5 rounded-lg"
        >
          <RefreshCw className={cn('w-4 h-4', isRefreshing && 'animate-spin')} aria-hidden="true" />
          <span className="hidden sm:inline">{isRTL ? 'تحديث' : 'Refresh'}</span>
        </Button>
        {onCustomize && (
          <Button
            variant={customizeActive ? 'default' : 'outline'}
            size="sm"
            onClick={onCustomize}
            aria-pressed={!!customizeActive}
            className="h-9 gap-1.5 rounded-lg"
          >
            <SlidersHorizontal className="w-4 h-4" aria-hidden="true" />
            <span className="hidden sm:inline">
              {customizeActive
                ? (isRTL ? 'إنهاء التخصيص' : 'Done')
                : (isRTL ? 'تخصيص اللوحة' : 'Customize')}
            </span>
          </Button>
        )}
      </div>
    </section>
  );
};

UnifiedDashboardHero.displayName = 'UnifiedDashboardHero';

/** Helper: format "x minutes ago" in Arabic/English. */
export function formatLastUpdated(date: Date | null | undefined, isRTL: boolean): string | null {
  if (!date) return null;
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.max(0, Math.round(diffMs / 60000));
  if (diffMin < 1) return isRTL ? 'آخر تحديث: الآن' : 'Updated just now';
  if (diffMin < 60) {
    return isRTL
      ? `آخر تحديث: منذ ${diffMin} د`
      : `Updated ${diffMin}m ago`;
  }
  const h = Math.round(diffMin / 60);
  return isRTL ? `آخر تحديث: منذ ${h} س` : `Updated ${h}h ago`;
}