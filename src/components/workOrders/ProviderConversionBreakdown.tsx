import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Inbox, FileText, FileSignature, CalendarDays, ShieldCheck } from 'lucide-react';
import {
  type OperationalMetrics,
} from '@/modules/operations/metrics/computeOperationalMetrics';
import { pickMetricLabel } from '@/modules/operations/metrics/metricLabels';

/**
 * BUSINESS-OPS-METRICS-4 — Provider-facing source conversion breakdown.
 * Clickable cards deep-link to /dashboard/operations/feed with
 * source+action query params pre-filled.
 *
 * Read-only compact cards showing how many work orders were converted
 * from each source type (lead, quote, contract, booking) within the
 * current activity window. Pure presentational; data comes from the
 * pre-computed OperationalMetrics object.
 *
 * No I/O, no fetch, no PII, no UUIDs.
 */

interface Props {
  metrics: OperationalMetrics;
  isRTL: boolean;
}

type SourceConfig = {
  key: 'ledToWo' | 'qteToWo' | 'cntToWo' | 'bkgToWo';
  icon: React.ReactNode;
  tone: string;
  to: string;
};

function SourceChip({
  value, label, icon, tone, to, ariaLabel,
}: {
  value: number;
  label: string;
  icon: React.ReactNode;
  tone: string;
  to: string;
  ariaLabel: string;
}) {
  return (
    <Link
      to={to}
      aria-label={ariaLabel}
      className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl"
    >
      <Card className="border-border/40 hover-lift">
        <CardContent className="p-3 flex items-center gap-3">
          <span className={`shrink-0 ${tone}`}>{icon}</span>
          <div className="min-w-0 flex-1">
            <div className="text-lg sm:text-xl font-semibold tabular-nums tech-content text-foreground">
              {value}
            </div>
            <div className="text-[11px] text-muted-foreground truncate" dir="auto">
              {label}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export function ProviderConversionBreakdown({ metrics, isRTL }: Props) {
  const L = pickMetricLabel;
  const sources: SourceConfig[] = [
    {
      key: 'ledToWo',
      icon: <Inbox className="w-5 h-5" aria-hidden="true" />,
      tone: 'text-blue-600 dark:text-blue-400',
    },
    {
      key: 'qteToWo',
      icon: <FileText className="w-5 h-5" aria-hidden="true" />,
      tone: 'text-amber-600 dark:text-amber-400',
    },
    {
      key: 'cntToWo',
      icon: <FileSignature className="w-5 h-5" aria-hidden="true" />,
      tone: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      key: 'bkgToWo',
      icon: <CalendarDays className="w-5 h-5" aria-hidden="true" />,
      tone: 'text-violet-600 dark:text-violet-400',
    },
  ];

  const sectionLabel = isRTL ? 'تحويل المصادر إلى أوامر عمل' : 'Source conversions to Work Orders';

  return (
    <section
      data-testid="provider-conversion-breakdown"
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
          data-testid="provider-conversion-approx-hint"
        >
          <ShieldCheck className="w-3 h-3" aria-hidden="true" />
          {L('approxHint', isRTL)}
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {sources.map((s) => (
          <SourceChip
            key={s.key}
            value={
              s.key === 'ledToWo'
                ? metrics.leadsQuotes.leadToWorkOrder
                : s.key === 'qteToWo'
                  ? metrics.leadsQuotes.quoteToWorkOrder
                  : s.key === 'cntToWo'
                    ? metrics.contracts.contractToWorkOrder
                    : metrics.bookings.bookingToWorkOrder
            }
            label={L(s.key, isRTL)}
            icon={s.icon}
            tone={s.tone}
          />
        ))}
      </div>
    </section>
  );
}

export default ProviderConversionBreakdown;
