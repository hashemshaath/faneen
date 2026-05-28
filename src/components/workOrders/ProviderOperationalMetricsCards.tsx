import { Card, CardContent } from '@/components/ui/card';
import { ShieldCheck } from 'lucide-react';
import {
  formatDurationShort,
  type OperationalMetrics,
} from '@/modules/operations/metrics/computeOperationalMetrics';
import { pickMetricLabel } from '@/modules/operations/metrics/metricLabels';

/**
 * BUSINESS-OPS-METRICS-2 — Provider-facing read-only operational metrics.
 *
 * Pure presentational: receives a pre-computed `OperationalMetrics`
 * object (from the same `computeOperationalMetrics` aggregator the
 * Admin Console uses) plus a `recentActivityCount` for the timeline
 * tile. No I/O, no fetch, no PII, no UUIDs, no destructive controls.
 *
 * Provider scope intentionally omits admin-only sections (notes,
 * cross-business stats). Numbers are window-capped by upstream limits;
 * the approximate hint communicates that to the user.
 */

interface Props {
  metrics: OperationalMetrics;
  isRTL: boolean;
  /** Optional: total activity events loaded in the current window. */
  recentActivityCount?: number;
}

type Tone = 'default' | 'warn' | 'danger' | 'ok' | 'accent';

function toneClass(tone: Tone): string {
  if (tone === 'danger') return 'text-destructive';
  if (tone === 'warn') return 'text-amber-600 dark:text-amber-400';
  if (tone === 'ok') return 'text-emerald-600 dark:text-emerald-400';
  if (tone === 'accent') return 'text-accent';
  return 'text-foreground';
}

function Tile({
  label, value, tone = 'default',
}: { label: string; value: string | number; tone?: Tone }) {
  return (
    <Card className="border-border/40">
      <CardContent className="p-3">
        <div className="text-[11px] text-muted-foreground" dir="auto">{label}</div>
        <div className={`mt-1 text-lg sm:text-xl font-semibold tabular-nums tech-content ${toneClass(tone)}`}>
          {value}
        </div>
      </CardContent>
    </Card>
  );
}

export function ProviderOperationalMetricsCards({
  metrics, isRTL, recentActivityCount,
}: Props) {
  const L = pickMetricLabel;
  const wo = metrics.workOrders;
  const recentLabel = isRTL ? 'النشاط الأخير' : 'Recent activity';
  const sectionLabel = L('sectionWO', isRTL);

  return (
    <section
      data-testid="provider-ops-metrics"
      aria-label={sectionLabel}
      dir={isRTL ? 'rtl' : 'ltr'}
      className="rounded-2xl border border-border/40 bg-card/40 p-3 sm:p-4 space-y-3"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[12px] sm:text-sm font-medium text-foreground" dir="auto">
          {sectionLabel}
        </h2>
        <p
          className="text-[11px] text-muted-foreground inline-flex items-center gap-1"
          data-testid="provider-ops-approx-hint"
        >
          <ShieldCheck className="w-3 h-3" aria-hidden="true" />
          {L('approxHint', isRTL)}
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-2">
        <Tile label={L('woOpen', isRTL)} value={wo.open} tone="accent" />
        <Tile label={L('woOverdue', isRTL)} value={wo.overdue} tone="danger" />
        <Tile label={L('woHigh', isRTL)} value={wo.highPriority} tone="warn" />
        <Tile label={L('woUnassigned', isRTL)} value={wo.unassignedOpen} tone="warn" />
        <Tile label={L('woCompleted', isRTL)} value={wo.completed} tone="ok" />
        <Tile label={L('woAvgAge', isRTL)} value={formatDurationShort(wo.avgOpenAgeMs)} />
        <Tile label={L('woAvgCycle', isRTL)} value={formatDurationShort(wo.avgCycleTimeMs)} />
        <Tile
          label={recentLabel}
          value={recentActivityCount ?? metrics.activity.totalEvents}
        />
      </div>
    </section>
  );
}

export default ProviderOperationalMetricsCards;