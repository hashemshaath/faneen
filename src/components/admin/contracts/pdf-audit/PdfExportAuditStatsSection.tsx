import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { CalendarDays, Activity, FileText, FileClock, User2 } from 'lucide-react';
import { PDF_AUDIT_SOURCE_LABEL, type PdfExportAuditSummary } from './types';

export interface PdfExportAuditStatsSectionProps {
  summary: PdfExportAuditSummary | null | undefined;
  isRTL: boolean;
}

const SummaryCard: React.FC<{ label: string; value: number | string; icon: React.ReactNode }> = ({ label, value, icon }) => (
  <Card>
    <CardContent className="p-3 flex items-center justify-between gap-2">
      <div className="min-w-0">
        <p className="text-[10px] text-muted-foreground truncate">{label}</p>
        <p className="text-base font-semibold tabular-nums" dir="ltr">{value}</p>
      </div>
      {icon}
    </CardContent>
  </Card>
);

export const PdfExportAuditStatsSection: React.FC<PdfExportAuditStatsSectionProps> = ({ summary, isRTL }) => {
  const topSourceLabel = (() => {
    const s = summary?.top_source;
    if (!s) return '—';
    return isRTL ? (PDF_AUDIT_SOURCE_LABEL[s]?.ar ?? s) : (PDF_AUDIT_SOURCE_LABEL[s]?.en ?? s);
  })();

  return (
    <section className="grid grid-cols-2 md:grid-cols-5 gap-3">
      <SummaryCard
        label={isRTL ? 'تصديرات اليوم' : 'Today'}
        value={summary?.exports_today ?? '—'}
        icon={<CalendarDays className="h-4 w-4 text-primary" />}
      />
      <SummaryCard
        label={isRTL ? 'آخر 7 أيام' : 'Last 7 days'}
        value={summary?.exports_7d ?? '—'}
        icon={<Activity className="h-4 w-4 text-primary" />}
      />
      <SummaryCard
        label={isRTL ? 'عقود فريدة (30 يوم)' : 'Unique contracts (30d)'}
        value={summary?.unique_contracts_30d ?? '—'}
        icon={<FileText className="h-4 w-4 text-primary" />}
      />
      <SummaryCard
        label={isRTL ? 'أعلى مصدر' : 'Top source'}
        value={topSourceLabel}
        icon={<User2 className="h-4 w-4 text-primary" />}
      />
      <SummaryCard
        label={isRTL ? 'مؤرشف' : 'Archived'}
        value={summary?.archived_count ?? '—'}
        icon={<FileClock className="h-4 w-4 text-muted-foreground" />}
      />
    </section>
  );
};