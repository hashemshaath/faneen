/**
 * Presentational charts panel for admin quote-operations.
 *
 * Pure UI — receives the daily aggregation series already built by the
 * parent (from the aggregation lib). Recharts JSX, data shape, and
 * chart keys remain identical to the inline version.
 */
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  Legend,
} from 'recharts';

export interface QuoteOperationsDailyPoint {
  date: string;
  quotes_created: number;
  quotes_matched: number;
  quotes_completed: number;
  leads_created: number;
  leads_viewed: number;
  leads_interested: number;
  leads_not_interested: number;
  avg_time_to_match_minutes: number | null;
  avg_time_to_first_view_minutes: number | null;
  avg_time_to_first_interest_minutes: number | null;
}

export interface QuoteOperationsChartsSectionProps {
  dailySeries: QuoteOperationsDailyPoint[];
}

const ChartCard: React.FC<{ title: string; wide?: boolean; children: React.ReactNode }> = ({
  title,
  wide,
  children,
}) => (
  <div className={`rounded-lg border border-border bg-card/50 p-3 ${wide ? 'lg:col-span-2' : ''}`}>
    <p className="text-xs font-medium text-foreground/80 mb-2">{title}</p>
    {children}
  </div>
);

export const QuoteOperationsChartsSection: React.FC<QuoteOperationsChartsSectionProps> = ({
  dailySeries,
}) => (
  <Card><CardContent className="p-5 space-y-4">
    <div>
      <h2 className="font-heading font-semibold text-base flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-primary" /> اتجاهات التشغيل
      </h2>
      <p className="text-xs text-muted-foreground mt-1">
        راقب حركة الطلبات والمطابقة وتفاعل المزودين خلال الفترة المحددة.
      </p>
    </div>
    {dailySeries.length === 0 ? (
      <p className="text-xs text-muted-foreground text-center py-8">
        لا توجد بيانات كافية لعرض الرسم خلال الفترة المحددة
      </p>
    ) : (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="حركة الطلبات اليومية">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={dailySeries} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
              <RTooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="quotes_created" name="جديدة" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="quotes_matched" name="موجّهة" stroke="hsl(var(--info))" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="quotes_completed" name="مكتملة" stroke="hsl(var(--success))" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="تفاعل المزودين مع الفرص">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={dailySeries} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
              <RTooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="leads_created" name="منشأة" fill="hsl(var(--primary))" />
              <Bar dataKey="leads_viewed" name="مشاهدة" fill="hsl(var(--info))" />
              <Bar dataKey="leads_interested" name="اهتمام" fill="hsl(var(--success))" />
              <Bar dataKey="leads_not_interested" name="رفض" fill="hsl(var(--muted-foreground))" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="متوسطات سرعة المعالجة (دقائق)" wide>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={dailySeries} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
              <RTooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="avg_time_to_match_minutes" name="وقت المطابقة" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} connectNulls />
              <Line type="monotone" dataKey="avg_time_to_first_view_minutes" name="أول مشاهدة" stroke="hsl(var(--info))" strokeWidth={2} dot={false} connectNulls />
              <Line type="monotone" dataKey="avg_time_to_first_interest_minutes" name="أول اهتمام" stroke="hsl(var(--success))" strokeWidth={2} dot={false} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    )}
  </CardContent></Card>
);

export default QuoteOperationsChartsSection;