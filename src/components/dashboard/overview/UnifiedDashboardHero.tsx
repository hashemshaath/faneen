import React from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, SlidersHorizontal, Sparkles } from 'lucide-react';
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
  const role = isRTL ? roleLabel.ar : roleLabel.en;
  const trimmedName = (fullName ?? '').trim();
  const initials = trimmedName
    ? trimmedName
        .split(/\s+/)
        .slice(0, 2)
        .map((w) => w.charAt(0).toUpperCase())
        .join('') || '👤'
    : '👤';

  return (
    <section
      aria-label={role}
      className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-card via-card to-primary/[0.03] p-5 sm:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-5"
    >
      {/* Decorative glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-16 -end-16 h-48 w-48 rounded-full bg-primary/10 blur-3xl"
      />

      <div className="relative flex items-center gap-4 min-w-0 flex-1">
        {/* Avatar with initials */}
        <div
          aria-hidden="true"
          className="shrink-0 h-14 w-14 sm:h-16 sm:w-16 rounded-2xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground flex items-center justify-center font-heading font-bold text-xl sm:text-2xl shadow-md shadow-primary/20 ring-4 ring-primary/5"
        >
          <span className="tech-content">{initials}</span>
        </div>

        <div className="min-w-0 flex-1">
          {/* Role badge */}
          <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider rounded-full px-2.5 py-1 mb-1.5 bg-primary/10 text-primary border border-primary/20">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" aria-hidden="true" />
            {role}
          </span>

          {/* Greeting (small, muted) */}
          <p className="text-xs sm:text-sm text-muted-foreground font-medium flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-primary/70" aria-hidden="true" />
            <span>{greeting}{trimmedName ? (isRTL ? '،' : ',') : ''}</span>
          </p>

          {/* Name — large, bold, dir="auto" so Latin names render naturally inside RTL */}
          {trimmedName ? (
            <h1
              dir="auto"
              className="font-heading text-2xl sm:text-3xl lg:text-[2rem] font-bold leading-tight text-foreground mt-0.5 break-words"
            >
              {trimmedName}
            </h1>
          ) : (
            <h1 className="font-heading text-2xl sm:text-3xl font-bold leading-tight text-foreground mt-0.5">
              {isRTL ? 'مرحباً بك' : 'Welcome'}
            </h1>
          )}

          {/* Meta row: ref id + last updated */}
          <p className="text-xs sm:text-[13px] text-muted-foreground mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
            {refId && (
              <span className="inline-flex items-center gap-1.5">
                <span>{isRTL ? 'رقم المرجع:' : 'Ref ID:'}</span>
                <span className="tech-content font-mono font-medium text-foreground/80 bg-muted/60 px-2 py-0.5 rounded-md border border-border/60">
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
      </div>

      <div className="relative flex items-center gap-2 shrink-0 flex-wrap">
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