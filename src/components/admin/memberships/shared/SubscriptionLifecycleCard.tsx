/**
 * Presentational read-only timeline of a subscription's lifecycle.
 * Pure UI: consumes pre-computed stages from props. No API, no Supabase,
 * no mutations, no calculations against the DB.
 */
import React from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import {
  CircleDot,
  CheckCircle2,
  ArrowUpCircle,
  ArrowDownCircle,
  RotateCw,
  AlertTriangle,
  XCircle,
  Clock,
} from 'lucide-react';

export type LifecycleStageKind =
  | 'created'
  | 'active'
  | 'upgraded'
  | 'downgraded'
  | 'renewed'
  | 'payment_failed'
  | 'canceled'
  | 'expired'
  | 'paused'
  | 'note';

export interface LifecycleStage {
  kind: LifecycleStageKind;
  /** Display label. Caller decides localization. */
  label: string;
  /** Optional secondary line: timestamp / context. */
  detail?: string;
  /** Optional ISO date string for display. */
  at?: string | null;
  /** Visual emphasis. Defaults inferred from `kind`. */
  tone?: 'success' | 'info' | 'warning' | 'destructive' | 'muted';
}

export interface SubscriptionLifecycleCardProps {
  stages: LifecycleStage[];
  title?: string;
  emptyLabel?: string;
  className?: string;
}

const KIND_ICON: Record<LifecycleStageKind, React.ComponentType<{ className?: string }>> = {
  created: CircleDot,
  active: CheckCircle2,
  upgraded: ArrowUpCircle,
  downgraded: ArrowDownCircle,
  renewed: RotateCw,
  payment_failed: AlertTriangle,
  canceled: XCircle,
  expired: Clock,
  paused: Clock,
  note: CircleDot,
};

const KIND_TONE: Record<LifecycleStageKind, 'success' | 'info' | 'warning' | 'destructive' | 'muted'> = {
  created: 'info',
  active: 'success',
  upgraded: 'success',
  downgraded: 'warning',
  renewed: 'info',
  payment_failed: 'destructive',
  canceled: 'muted',
  expired: 'destructive',
  paused: 'warning',
  note: 'muted',
};

const TONE_TEXT: Record<string, string> = {
  success: 'text-success',
  info: 'text-info',
  warning: 'text-warning',
  destructive: 'text-destructive',
  muted: 'text-muted-foreground',
};

const TONE_RING: Record<string, string> = {
  success: 'bg-success/10 border-success/30',
  info: 'bg-info/10 border-info/30',
  warning: 'bg-warning/10 border-warning/30',
  destructive: 'bg-destructive/10 border-destructive/30',
  muted: 'bg-muted border-border',
};

export const SubscriptionLifecycleCard: React.FC<SubscriptionLifecycleCardProps> = ({
  stages,
  title,
  emptyLabel,
  className,
}) => {
  return (
    <Card className={cn('', className)}>
      <CardContent className="p-4 space-y-3">
        {title && <h4 className="text-xs font-semibold text-foreground">{title}</h4>}
        {stages.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">{emptyLabel ?? '—'}</p>
        ) : (
          <ol className="relative space-y-3">
            {stages.map((s, i) => {
              const Icon = KIND_ICON[s.kind];
              const tone = s.tone ?? KIND_TONE[s.kind];
              return (
                <li key={`${s.kind}-${i}`} className="flex items-start gap-3">
                  <span
                    className={cn(
                      'shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-full border',
                      TONE_RING[tone],
                    )}
                  >
                    <Icon className={cn('h-3.5 w-3.5', TONE_TEXT[tone])} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium text-foreground">{s.label}</div>
                    {(s.detail || s.at) && (
                      <div className="text-[11px] text-muted-foreground tech-content mt-0.5">
                        {s.at ? new Date(s.at).toLocaleString('en-US') : ''}
                        {s.at && s.detail ? ' · ' : ''}
                        {s.detail ?? ''}
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
};

export default SubscriptionLifecycleCard;