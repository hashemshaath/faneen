/**
 * Presentational matching-performance + provider-engagement panel pair
 * for admin quote-operations.
 *
 * Pure UI — receives pre-aggregated counters from the parent. No
 * queries, no mutations, no Supabase, no aggregation logic.
 */
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Target, Users } from 'lucide-react';

export interface QuoteOperationsMatchingData {
  matchedQuotes: number;
  failedQuotes: number;
  avgLeadsPerQuote: number | null;
  avgScore: number | null;
  topScore: number | null;
  topReasons: Array<[string, number]>;
}

export interface QuoteOperationsProvidersData {
  totalLeads: number;
  viewedLeads: number;
  interestedLeads: number;
  notInterestedLeads: number;
  viewRate: number | null;
  interestRate: number | null;
  rejectionRate: number | null;
}

export interface QuoteOperationsMatchingSectionProps {
  matching: QuoteOperationsMatchingData;
  providers: QuoteOperationsProvidersData;
}

const Stat: React.FC<{ label: string; value: number | string }> = ({ label, value }) => (
  <div className="rounded-md border border-border bg-muted/30 p-2">
    <div className="text-[11px] text-muted-foreground">{label}</div>
    <div className="text-base font-bold tech-content">{value}</div>
  </div>
);

const rate = (v: number | null): string =>
  v === null ? '—' : `${Math.round(100 * v)}%`;

export const QuoteOperationsMatchingSection: React.FC<QuoteOperationsMatchingSectionProps> = ({
  matching,
  providers,
}) => (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
    <Card><CardContent className="p-5 space-y-3">
      <h2 className="font-heading font-semibold text-base flex items-center gap-2">
        <Target className="h-4 w-4 text-primary" /> أداء المطابقة
      </h2>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <Stat label="طلبات مُوجَّهة" value={matching.matchedQuotes} />
        <Stat label="بدون مطابقة" value={matching.failedQuotes} />
        <Stat label="متوسط مزودين/طلب" value={matching.avgLeadsPerQuote === null ? '—' : matching.avgLeadsPerQuote.toFixed(1)} />
        <Stat label="متوسط درجة المطابقة" value={matching.avgScore === null ? '—' : Math.round(matching.avgScore)} />
        <Stat label="أعلى درجة" value={matching.topScore ?? '—'} />
      </div>
      <div className="pt-2 border-t">
        <p className="text-xs text-muted-foreground mb-2">أكثر أسباب المطابقة تكرارًا</p>
        {matching.topReasons.length === 0 ? (
          <p className="text-xs text-muted-foreground">لا توجد بيانات كافية بعد.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {matching.topReasons.map(([r, n]) => (
              <span key={r} className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-foreground/80 border border-border">
                {r} · <span className="tech-content">{n}</span>
              </span>
            ))}
          </div>
        )}
      </div>
    </CardContent></Card>

    <Card><CardContent className="p-5 space-y-3">
      <h2 className="font-heading font-semibold text-base flex items-center gap-2">
        <Users className="h-4 w-4 text-primary" /> تفاعل المزودين
      </h2>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <Stat label="إجمالي الفرص" value={providers.totalLeads} />
        <Stat label="مشاهدات" value={providers.viewedLeads} />
        <Stat label="اهتمام" value={providers.interestedLeads} />
        <Stat label="غير مناسب" value={providers.notInterestedLeads} />
        <Stat label="معدل المشاهدة" value={rate(providers.viewRate)} />
        <Stat label="معدل الاهتمام" value={rate(providers.interestRate)} />
        <Stat label="معدل الرفض" value={rate(providers.rejectionRate)} />
      </div>
    </CardContent></Card>
  </div>
);

export default QuoteOperationsMatchingSection;