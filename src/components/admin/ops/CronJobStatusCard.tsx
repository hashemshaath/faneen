import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { CalendarClock, Timer, AlertCircle } from 'lucide-react';
import { OperationsStatusBadge, type OperationsStatus } from './OperationsStatusBadge';

export interface CronJobStatusCardProps {
  name: string;
  description?: string;
  status: OperationsStatus;
  statusLabel: string;
  lastRunLabel?: string;
  nextRunLabel?: string;
  durationLabel?: string;
  errorCount?: number;
  errorCountLabel?: string;
  i18n?: {
    lastRun?: string;
    nextRun?: string;
    duration?: string;
    errors?: string;
  };
  rightSlot?: React.ReactNode;
  onClick?: () => void;
}

/**
 * CronJobStatusCard — display-only card for cron job state. Never reads or
 * writes cron schedules.
 */
export const CronJobStatusCard: React.FC<CronJobStatusCardProps> = ({
  name, description, status, statusLabel,
  lastRunLabel, nextRunLabel, durationLabel,
  errorCount, errorCountLabel, i18n, rightSlot, onClick,
}) => {
  const t = {
    lastRun: i18n?.lastRun ?? 'Last run',
    nextRun: i18n?.nextRun ?? 'Next run',
    duration: i18n?.duration ?? 'Duration',
    errors: i18n?.errors ?? 'Errors',
  };
  const Comp = onClick ? 'button' : 'div';
  return (
    <Card className="rounded-3xl border-border/60 bg-card/80 backdrop-blur-sm">
      <CardContent className="p-4 md:p-5">
        <Comp
          type={onClick ? 'button' : undefined}
          onClick={onClick}
          className={['w-full text-start space-y-3', onClick ? 'cursor-pointer' : ''].join(' ')}
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="font-semibold truncate">{name}</div>
              {description && (
                <div className="text-xs text-muted-foreground line-clamp-2">{description}</div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <OperationsStatusBadge status={status} label={statusLabel} />
              {rightSlot}
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            {lastRunLabel && (
              <div className="rounded-xl border border-border/60 bg-background/40 p-2">
                <div className="text-muted-foreground inline-flex items-center gap-1">
                  <CalendarClock className="h-3 w-3" aria-hidden /> {t.lastRun}
                </div>
                <div className="mt-0.5 font-medium tech-content">{lastRunLabel}</div>
              </div>
            )}
            {nextRunLabel && (
              <div className="rounded-xl border border-border/60 bg-background/40 p-2">
                <div className="text-muted-foreground inline-flex items-center gap-1">
                  <CalendarClock className="h-3 w-3" aria-hidden /> {t.nextRun}
                </div>
                <div className="mt-0.5 font-medium tech-content">{nextRunLabel}</div>
              </div>
            )}
            {durationLabel && (
              <div className="rounded-xl border border-border/60 bg-background/40 p-2">
                <div className="text-muted-foreground inline-flex items-center gap-1">
                  <Timer className="h-3 w-3" aria-hidden /> {t.duration}
                </div>
                <div className="mt-0.5 font-medium tech-content">{durationLabel}</div>
              </div>
            )}
            {typeof errorCount === 'number' && (
              <div className={[
                'rounded-xl border p-2',
                errorCount > 0
                  ? 'border-destructive/30 bg-destructive/5 text-destructive'
                  : 'border-border/60 bg-background/40',
              ].join(' ')}>
                <div className="inline-flex items-center gap-1 opacity-80">
                  <AlertCircle className="h-3 w-3" aria-hidden /> {errorCountLabel ?? t.errors}
                </div>
                <div className="mt-0.5 font-semibold tabular-nums tech-content">{errorCount}</div>
              </div>
            )}
          </div>
        </Comp>
      </CardContent>
    </Card>
  );
};

export default CronJobStatusCard;