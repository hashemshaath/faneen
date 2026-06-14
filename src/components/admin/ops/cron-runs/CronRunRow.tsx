import React from 'react';
import {
  AlertCircle, CalendarClock, ChevronDown, Loader2, Timer,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { TechnicalText } from '@/components/ui/technical-text';
import { OperationsStatusBadge, type OperationsStatus } from '@/components/admin/ops/OperationsStatusBadge';

export interface CronRunRowItem {
  id: string;
  jobName: string;
  humanJobName: string;
  status: string | null;
  ok: boolean | null;
  startedAtRelative: string;
  startedAtAbsolute: string;
  finishedAtAbsolute: string;
  durationLabel: string;
  statusLabel: string;
  errorCode: string | null;
  errorMessage: string | null;
  summary: Record<string, unknown> | null;
}

export interface CronRunRowProps {
  item: CronRunRowItem;
  isOpen: boolean;
  onToggle: () => void;
  labels: {
    startedAt: string;
    finishedAt: string;
    duration: string;
    status: string;
    summary: string;
    errorFallback: string;
  };
}

function truncate(s: string, n = 200): string {
  return s.length > n ? s.slice(0, n) + '…' : s;
}

function mapOpsStatus(ok: boolean | null): OperationsStatus {
  if (ok === true) return 'success';
  if (ok === false) return 'failed';
  return 'running';
}

/**
 * CronRunRow — presentational row for a single cron run entry.
 * No queries, no mutations, no side-effects.
 */
export const CronRunRow: React.FC<CronRunRowProps> = ({
  item, isOpen, onToggle, labels,
}) => {
  const opsStatus = mapOpsStatus(item.ok);
  return (
    <li>
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-start px-4 py-3 hover:bg-muted/40 transition-colors flex items-center gap-3"
      >
        <span
          className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${
            opsStatus === 'success'
              ? 'bg-success/15 text-success'
              : opsStatus === 'failed'
                ? 'bg-destructive/15 text-destructive'
                : 'bg-muted text-muted-foreground'
          }`}
        >
          {opsStatus === 'success' ? <span aria-hidden>✓</span>
            : opsStatus === 'failed' ? <span aria-hidden>✕</span>
            : <Loader2 className="h-4 w-4" />}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="text-xs font-semibold text-foreground"
              dir="auto"
              title={item.jobName}
            >
              {item.humanJobName}
            </span>
            <span className="text-[10px] text-muted-foreground">·</span>
            <TechnicalText className="text-[11px] text-muted-foreground">
              {item.jobName}
            </TechnicalText>
            <OperationsStatusBadge status={opsStatus} label={item.statusLabel} size="sm" />
            {item.status && (
              <Badge variant="outline" className="text-[10px] py-0 h-4">
                {item.status}
              </Badge>
            )}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <CalendarClock className="h-3 w-3" />
              {item.startedAtRelative}
            </span>
            <span className="inline-flex items-center gap-1">
              <Timer className="h-3 w-3" />
              {item.durationLabel}
            </span>
            {item.errorCode && (
              <span className="inline-flex items-center gap-1 text-destructive font-medium">
                <AlertCircle className="h-3 w-3" />
                {item.errorCode}
              </span>
            )}
          </div>
        </div>
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      {isOpen && (
        <div className="px-4 pb-4 pt-1 bg-muted/20 border-t border-border/40">
          <div className="grid sm:grid-cols-2 gap-3 text-[11px]">
            <DetailRow label={labels.startedAt} value={item.startedAtAbsolute} />
            <DetailRow label={labels.finishedAt} value={item.finishedAtAbsolute} />
            <DetailRow label={labels.duration} value={item.durationLabel} />
            <DetailRow label={labels.status} value={item.status ?? '—'} />
          </div>
          {item.summary && typeof item.summary === 'object' && Object.keys(item.summary).length > 0 && (
            <div className="mt-3">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1.5 font-semibold">
                {labels.summary}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(item.summary).map(([k, v]) => (
                  <span
                    key={k}
                    className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-[11px]"
                  >
                    <span className="text-muted-foreground">{k}:</span>
                    <TechnicalText className="font-semibold text-foreground">
                      {typeof v === 'object' ? JSON.stringify(v).slice(0, 60) : String(v)}
                    </TechnicalText>
                  </span>
                ))}
              </div>
            </div>
          )}
          {item.errorMessage && (
            <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <AlertCircle className="h-3.5 w-3.5 text-destructive" />
                <span className="text-[11px] font-semibold text-destructive">
                  {item.errorCode ?? labels.errorFallback}
                </span>
              </div>
              <TechnicalText as="p" mono={false} className="text-[11px] text-destructive/90 leading-relaxed">
                {truncate(item.errorMessage, 600)}
              </TechnicalText>
            </div>
          )}
        </div>
      )}
    </li>
  );
};

const DetailRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex items-center justify-between gap-2 rounded-md bg-background border border-border/60 px-2.5 py-1.5">
    <span className="text-muted-foreground">{label}</span>
    <TechnicalText className="font-semibold text-foreground text-[11px] truncate max-w-[60%]">{value}</TechnicalText>
  </div>
);

export default CronRunRow;