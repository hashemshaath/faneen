/**
 * Presentational KPI + SLA + rate cards for admin quote-operations.
 *
 * Pure UI — receives a pre-computed `metrics` object from the parent and
 * renders the three stat rows (KPI cards, SLA detail row, conversion
 * rates row). No queries, no aggregation, no Supabase, no mutations.
 * Formatters (`fmtDuration`, `pct`) are local display helpers that match
 * the values previously rendered by `AdminQuoteOperations.tsx`.
 */
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Sparkles, Clock, Info } from 'lucide-react';

export interface QuoteOperationsStatsMetrics {
  total: number;
  byStatus: Record<string, number>;
  quotesWithInterest: number;
  sla: {
    ttMatch: number | null;
    ttView: number | null;
    ttInterest: number | null;
    ttReveal: number | null;
  };
  matching: {
    matchedQuotes: number;
    failedQuotes: number;
  };
  providers: {
    totalLeads: number;
    viewedLeads: number;
    interestedLeads: number;
  };
}

export interface QuoteOperationsStatsSectionProps {
  metrics: QuoteOperationsStatsMetrics;
  revealedCount: number;
}

function fmtDuration(ms: number | null): string {
  if (ms === null || !isFinite(ms) || ms < 0) return '—';
  const m = Math.floor(ms / 60000);
  if (m < 1) return 'أقل من دقيقة';
  if (m < 60) return `${m} دقيقة`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ساعة`;
  const d = Math.floor(h / 24);
  return `${d} يوم`;
}

function pct(num: number, den: number): string {
  return den === 0 ? '—' : `${Math.round((100 * num) / den)}%`;
}

const Kpi: React.FC<{ label: string; value: number; icon?: React.ReactNode }> = ({ label, value, icon }) => (
  <Card><CardContent className="p-3">
    <div className="flex items-center justify-between">
      <span className="text-xs text-muted-foreground">{label}</span>
      {icon && <span className="text-muted-foreground">{icon}</span>}
    </div>
    <div className="text-xl font-bold tech-content mt-1">{value}</div>
  </CardContent></Card>
);

const KpiText: React.FC<{ label: string; value: string; tip?: string; icon?: React.ReactNode }> = ({ label, value, tip, icon }) => (
  <Card><CardContent className="p-3">
    <div className="flex items-center justify-between gap-1">
      <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
        {label}
        {tip && (
          <Tooltip>
            <TooltipTrigger asChild><span><Info className="h-3 w-3 text-muted-foreground/70" /></span></TooltipTrigger>
            <TooltipContent className="max-w-[220px] text-xs">{tip}</TooltipContent>
          </Tooltip>
        )}
      </span>
      {icon && <span className="text-muted-foreground">{icon}</span>}
    </div>
    <div className="text-base font-bold mt-1">{value}</div>
  </CardContent></Card>
);

const SlaCard: React.FC<{ label: string; value: string; tip?: string }> = ({ label, value, tip }) => (
  <Card><CardContent className="p-4">
    <div className="text-xs text-muted-foreground inline-flex items-center gap-1">
      {label}
      {tip && (
        <Tooltip>
          <TooltipTrigger asChild><span><Info className="h-3 w-3 text-muted-foreground/70" /></span></TooltipTrigger>
          <TooltipContent className="max-w-[240px] text-xs">{tip}</TooltipContent>
        </Tooltip>
      )}
    </div>
    <div className="text-lg font-bold mt-1">{value}</div>
  </CardContent></Card>
);

export const QuoteOperationsStatsSection: React.FC<QuoteOperationsStatsSectionProps> = ({
  metrics,
  revealedCount,
}) => {
  const matchTotal = metrics.matching.matchedQuotes + metrics.matching.failedQuotes;
  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <Kpi label="إجمالي الطلبات" value={metrics.total} icon={<Sparkles className="h-4 w-4" />} />
        <Kpi label="جديدة" value={metrics.byStatus.new ?? 0} />
        <Kpi label="قيد المراجعة" value={metrics.byStatus.under_review ?? 0} />
        <Kpi label="موجّهة" value={metrics.byStatus.matched ?? 0} />
        <Kpi label="فيها مهتم" value={metrics.quotesWithInterest} />
        <Kpi label="تم التواصل" value={metrics.byStatus.contacted ?? 0} />
        <Kpi label="مكتملة" value={metrics.byStatus.completed ?? 0} />
        <Kpi label="ملغاة" value={metrics.byStatus.cancelled ?? 0} />
        <KpiText
          label="متوسط وقت المطابقة"
          value={fmtDuration(metrics.sla.ttMatch)}
          tip="الوقت بين إنشاء الطلب وتوجيهه للمزودين."
          icon={<Clock className="h-4 w-4" />}
        />
        <KpiText
          label="متوسط أول مشاهدة"
          value={fmtDuration(metrics.sla.ttView)}
          tip="الوقت بين توجيه الفرصة للمزود وأول مشاهدة منه."
          icon={<Clock className="h-4 w-4" />}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <SlaCard label="متوسط أول اهتمام" value={fmtDuration(metrics.sla.ttInterest)}
          tip="الوقت بين إنشاء الفرصة وأول اهتمام من مزود." />
        <SlaCard label="متوسط إتاحة التواصل بعد الاهتمام" value={fmtDuration(metrics.sla.ttReveal)}
          tip="الوقت بين إبداء المزود اهتمامه وإتاحة بيانات التواصل." />
        <SlaCard label="نسبة المطابقة الناجحة"
          value={matchTotal === 0 ? '—' :
            `${Math.round((100 * metrics.matching.matchedQuotes) / matchTotal)}%`}
          tip="نسبة الطلبات التي وُجدت لها مزودون مطابقون." />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SlaCard label="معدل المطابقة"
          value={pct(metrics.matching.matchedQuotes, metrics.total)}
          tip="نسبة الطلبات التي تم توجيهها لمزودين." />
        <SlaCard label="معدل مشاهدة المزودين"
          value={pct(metrics.providers.viewedLeads, metrics.providers.totalLeads)}
          tip="نسبة الفرص التي شاهدها المزودون." />
        <SlaCard label="معدل الاهتمام"
          value={pct(metrics.providers.interestedLeads, metrics.providers.totalLeads)}
          tip="نسبة الفرص التي أبدى المزود اهتمامًا بها." />
        <SlaCard label="معدل إتاحة التواصل بعد الاهتمام"
          value={pct(revealedCount, metrics.providers.interestedLeads)}
          tip="نسبة الفرص المهتمة التي أُتيحت بياناتها للمزود." />
      </div>
    </>
  );
};

export default QuoteOperationsStatsSection;