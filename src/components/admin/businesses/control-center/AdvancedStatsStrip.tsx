import React, { useMemo } from 'react';
import { ShieldCheck, Gauge, TrendingUp, TrendingDown, Beaker, Clock } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { pickBi } from '@/components/common/Bilingual';
import {
  computeAdvancedMetrics,
  type BusinessMetricsRow,
} from '@/modules/admin/businesses/businessAdminMetrics';

interface Props {
  rows: ReadonlyArray<BusinessMetricsRow>;
  isRTL: boolean;
}

interface Tile {
  label: string;
  value: string;
  hint?: string;
  icon: React.ElementType;
  tone: 'primary' | 'success' | 'warning' | 'accent' | 'info' | 'destructive';
  trendUp?: boolean;
}

const TONE_BG: Record<Tile['tone'], string> = {
  primary:    'from-primary/15 to-primary/0 text-primary',
  success:    'from-success/15 to-success/0 text-success',
  warning:    'from-warning/15 to-warning/0 text-warning-foreground',
  accent:     'from-accent/20 to-accent/0 text-accent-foreground',
  info:       'from-info/15 to-info/0 text-info-foreground',
  destructive:'from-destructive/15 to-destructive/0 text-destructive',
};

/**
 * Executive advanced-stats strip — secondary KPIs that complement the
 * primary count cards: rates, weekly velocity, completeness average,
 * review backlog, demo ratio. All derived from already-loaded rows.
 */
export const AdvancedStatsStrip: React.FC<Props> = ({ rows, isRTL }) => {
  const a = useMemo(() => computeAdvancedMetrics(rows), [rows]);

  const velocityHint = a.prevWeeklyCreated
    ? `${a.weeklyDelta >= 0 ? '+' : ''}${a.weeklyDeltaPct}% ${pickBi(isRTL, 'مقارنة بالأسبوع السابق', 'vs previous week')}`
    : pickBi(isRTL, 'لا يوجد سجل سابق', 'No prior week');

  const tiles: Tile[] = [
    {
      label: pickBi(isRTL, 'معدل التحقق', 'Verification rate'),
      value: `${a.verificationRate}%`,
      hint: pickBi(isRTL, 'موثّقة من الإجمالي', 'verified of total'),
      icon: ShieldCheck, tone: 'success',
    },
    {
      label: pickBi(isRTL, 'متوسط الاكتمال', 'Avg completeness'),
      value: `${a.avgCompleteness}%`,
      hint: pickBi(isRTL, 'تواصل · رابط · وصف · صور', 'contact · link · desc · media'),
      icon: Gauge, tone: 'primary',
    },
    {
      label: pickBi(isRTL, 'سرعة الإضافة', 'Weekly velocity'),
      value: String(a.weeklyCreated),
      hint: velocityHint,
      icon: a.weeklyDelta >= 0 ? TrendingUp : TrendingDown,
      tone: a.weeklyDelta >= 0 ? 'accent' : 'warning',
      trendUp: a.weeklyDelta >= 0,
    },
    {
      label: pickBi(isRTL, 'تراكم المراجعة', 'Review backlog'),
      value: String(a.reviewBacklog),
      hint: pickBi(isRTL, 'بحاجة لقرار إداري', 'awaiting admin decision'),
      icon: Clock, tone: a.reviewBacklog > 0 ? 'warning' : 'success',
    },
    {
      label: pickBi(isRTL, 'نسبة التجريبية', 'Demo ratio'),
      value: `${a.demoRatio}%`,
      hint: pickBi(isRTL, 'بيانات اختبار يجب تقليلها', 'test data to minimize'),
      icon: Beaker, tone: a.demoRatio > 10 ? 'destructive' : 'muted' as Tile['tone'],
    },
  ];

  return (
    <div
      className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3"
      data-testid="control-center-advanced-stats"
    >
      {tiles.map((t) => {
        const Icon = t.icon;
        return (
          <Card
            key={t.label}
            className={`relative overflow-hidden rounded-2xl border-border/60 bg-gradient-to-br ${TONE_BG[t.tone]} bg-card/70 hover-lift`}
          >
            <div className="p-3.5 flex items-start gap-3">
              <div className="h-9 w-9 rounded-xl bg-background/60 border border-border/60 grid place-items-center shrink-0">
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] text-muted-foreground truncate">{t.label}</div>
                <div className="text-2xl font-bold leading-tight tabular-nums">{t.value}</div>
                {t.hint ? (
                  <div className="text-[10.5px] text-muted-foreground mt-0.5 truncate">{t.hint}</div>
                ) : null}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
};

export default AdvancedStatsStrip;