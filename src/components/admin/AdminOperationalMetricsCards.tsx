import { Card, CardContent } from '@/components/ui/card';
import { ShieldCheck } from 'lucide-react';
import {
  formatDurationShort,
  type OperationalMetrics,
} from '@/modules/operations/metrics/computeOperationalMetrics';
import {
  pickMetricLabel,
  type OperationalMetricLabelKey,
} from '@/modules/operations/metrics/metricLabels';

/**
 * BUSINESS-OPS-METRICS-1 — Read-only operational metrics cards.
 *
 * Renders sanitized metrics from a pre-computed `OperationalMetrics`
 * object. No I/O, no PII, no UUIDs, no destructive controls.
 */

interface Props {
  metrics: OperationalMetrics;
  isRTL: boolean;
}

type Tone = 'default' | 'warn' | 'danger' | 'ok' | 'accent';

function toneClass(tone: Tone): string {
  if (tone === 'danger') return 'text-destructive';
  if (tone === 'warn') return 'text-amber-600 dark:text-amber-400';
  if (tone === 'ok') return 'text-emerald-600 dark:text-emerald-400';
  if (tone === 'accent') return 'text-accent';
  return 'text-foreground';
}

function MiniStat({
  label, value, tone = 'default',
}: { label: string; value: string | number; tone?: Tone }) {
  return (
    <Card className="border-border/40">
      <CardContent className="p-3">
        <div className="text-[11px] text-muted-foreground" dir="auto">{label}</div>
        <div className={`mt-1 text-xl font-semibold tabular-nums tech-content ${toneClass(tone)}`}>
          {value}
        </div>
      </CardContent>
    </Card>
  );
}

function Section({
  titleKey, isRTL, children,
}: { titleKey: OperationalMetricLabelKey; isRTL: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h2 className="text-[12px] font-medium text-muted-foreground" dir="auto">
        {pickMetricLabel(titleKey, isRTL)}
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        {children}
      </div>
    </div>
  );
}

export function AdminOperationalMetricsCards({ metrics, isRTL }: Props) {
  const L = (k: OperationalMetricLabelKey) => pickMetricLabel(k, isRTL);
  const wo = metrics.workOrders;
  const lq = metrics.leadsQuotes;
  const c = metrics.contracts;
  const b = metrics.bookings;
  const s = metrics.adminSupport;

  return (
    <div className="space-y-3" data-testid="admin-ops-metrics" dir={isRTL ? 'rtl' : 'ltr'}>
      <p className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
        <ShieldCheck className="w-3 h-3" /> {L('approxHint')}
      </p>

      <Section titleKey="sectionWO" isRTL={isRTL}>
        <MiniStat label={L('woOpen')} value={wo.open} tone="accent" />
        <MiniStat label={L('woOverdue')} value={wo.overdue} tone="danger" />
        <MiniStat label={L('woHigh')} value={wo.highPriority} tone="warn" />
        <MiniStat label={L('woUnassigned')} value={wo.unassignedOpen} tone="warn" />
        <MiniStat label={L('woCompleted')} value={wo.completed} tone="ok" />
        <MiniStat label={L('woAvgAge')} value={formatDurationShort(wo.avgOpenAgeMs)} />
        <MiniStat label={L('woAvgCycle')} value={formatDurationShort(wo.avgCycleTimeMs)} />
      </Section>

      <Section titleKey="sectionLeadsQuotes" isRTL={isRTL}>
        <MiniStat label={L('ledNew')} value={lq.newLeads} />
        <MiniStat label={L('ledStatus')} value={lq.leadStatusChanged} />
        <MiniStat label={L('qteResponded')} value={lq.quoteResponded} />
        <MiniStat label={L('ledToWo')} value={lq.leadToWorkOrder} tone="ok" />
        <MiniStat label={L('qteToWo')} value={lq.quoteToWorkOrder} tone="ok" />
      </Section>

      <Section titleKey="sectionContracts" isRTL={isRTL}>
        <MiniStat label={L('cntCreated')} value={c.created} />
        <MiniStat label={L('cntStatus')} value={c.statusChanged} />
        <MiniStat label={L('cntSigned')} value={c.signed} tone="ok" />
        <MiniStat label={L('cntToWo')} value={c.contractToWorkOrder} tone="ok" />
      </Section>

      <Section titleKey="sectionBookings" isRTL={isRTL}>
        <MiniStat label={L('bkgCreated')} value={b.created} />
        <MiniStat label={L('bkgStatus')} value={b.statusChanged} />
        <MiniStat label={L('bkgToWo')} value={b.bookingToWorkOrder} tone="ok" />
      </Section>

      <Section titleKey="sectionSupport" isRTL={isRTL}>
        <MiniStat label={L('notesOpen')} value={s.openNotes} tone="accent" />
        <MiniStat label={L('notesCritical')} value={s.criticalNotes} tone="danger" />
        <MiniStat label={L('notesStale')} value={s.staleOpenNotes} tone="warn" />
      </Section>
    </div>
  );
}