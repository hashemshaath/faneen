import React from 'react';
import { Activity, ShieldCheck, CheckCircle2, Gauge, Phone, Rocket, Database } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { pickBi } from '@/components/common/Bilingual';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { HealthScore } from '@/modules/admin/businesses/businessAdminMetrics';

interface Props {
  health: HealthScore;
  isRTL: boolean;
}

const DIM_META: Record<
  HealthScore['dimensions'][number]['key'],
  {
    ar: string; en: string; icon: React.ElementType;
    formulaAr: string; formulaEn: string;
  }
> = {
  publish: {
    ar: 'النشر', en: 'Publish', icon: CheckCircle2,
    formulaAr: 'النسبة المئوية للصفوف التي is_active = true و is_demo = false',
    formulaEn: '% of rows where is_active = true AND is_demo = false',
  },
  verify: {
    ar: 'التحقّق', en: 'Verify', icon: ShieldCheck,
    formulaAr: 'النسبة المئوية للصفوف التي is_verified = true',
    formulaEn: '% of rows where is_verified = true',
  },
  completeness: {
    ar: 'الاكتمال', en: 'Completeness', icon: Gauge,
    formulaAr: 'متوسط (تواصل ٢٥٪ + اسم مستخدم ٢٥٪ + وصف ٢٥٪ + وسائط ٢٥٪)',
    formulaEn: 'avg of (contact 25% + username 25% + description 25% + media 25%)',
  },
  contact: {
    ar: 'تغطية التواصل', en: 'Contact coverage', icon: Phone,
    formulaAr: 'النسبة المئوية للصفوف التي لديها هاتف أو بريد',
    formulaEn: '% of rows with phone OR email',
  },
  pilot: {
    ar: 'الجاهزية', en: 'Pilot ready', icon: Rocket,
    formulaAr: 'نشطة · غير تجريبية · لها username · لها تواصل · غير معلّقة/مرفوضة',
    formulaEn: 'active · non-demo · has username · has contact · not pending/rejected',
  },
};

const GRADE_TONE: Record<HealthScore['grade'], { ring: string; text: string; bg: string }> = {
  A: { ring: 'stroke-success',     text: 'text-success',     bg: 'bg-success/10'     },
  B: { ring: 'stroke-primary',     text: 'text-primary',     bg: 'bg-primary/10'     },
  C: { ring: 'stroke-warning',     text: 'text-warning',     bg: 'bg-warning/10'     },
  D: { ring: 'stroke-destructive', text: 'text-destructive', bg: 'bg-destructive/10' },
};

/**
 * Executive health score: weighted composite of the directory's quality
 * signals rendered as a radial gauge with per-dimension breakdown chips.
 */
export const HealthScoreCard: React.FC<Props> = React.memo(({ health, isRTL }) => {
  const tone = GRADE_TONE[health.grade];
  const R = 38;
  const C = 2 * Math.PI * R;
  const offset = C - (health.score / 100) * C;

  return (
    <TooltipProvider delayDuration={120}>
    <Card className="rounded-2xl border-border/60 bg-card overflow-hidden">
      <div className="p-4 md:p-5 flex flex-col md:flex-row md:items-center gap-5">
        {/* Gauge */}
        <div className="flex items-center gap-4 shrink-0">
          <div className="relative h-24 w-24">
            <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
              <circle cx="50" cy="50" r={R} className="stroke-muted" strokeWidth="9" fill="none" />
              <circle
                cx="50" cy="50" r={R}
                className={`${tone.ring} transition-all`}
                strokeWidth="9" fill="none" strokeLinecap="round"
                strokeDasharray={C}
                strokeDashoffset={offset}
              />
            </svg>
            <div className="absolute inset-0 grid place-items-center">
              <div className="flex flex-col items-center leading-none">
                <span className={`text-2xl font-heading font-bold tabular-nums ${tone.text}`}>
                  {health.score}
                </span>
                <span className="mt-0.5 text-[9px] text-muted-foreground tabular-nums">/100</span>
              </div>
            </div>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Activity className={`h-4 w-4 ${tone.text}`} />
              <h3 className="text-sm font-semibold text-foreground">
                {pickBi(isRTL, 'مؤشر صحّة الدليل', 'Directory health score')}
              </h3>
            </div>
            <div className="mt-1.5 flex items-center gap-2 flex-wrap">
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${tone.bg} ${tone.text}`}>
                {pickBi(isRTL, 'التقدير', 'Grade')} · {health.grade}
              </span>
              <span className="text-[11px] text-muted-foreground">
                {pickBi(isRTL, 'مرجّح من ٥ أبعاد', 'weighted across 5 dimensions')}
              </span>
              <span className="inline-flex items-center gap-1 text-[10.5px] font-medium text-success bg-success/10 px-1.5 py-0.5 rounded-md">
                <Database className="h-3 w-3" />
                {pickBi(isRTL, `حيّ · ${health.total} صف`, `live · ${health.total} rows`)}
              </span>
            </div>
          </div>
        </div>

        {/* Per-dimension breakdown */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 flex-1">
          {health.dimensions.map((d) => {
            const meta = DIM_META[d.key];
            const Icon = meta.icon;
            const score = Math.round(d.score);
            const dimTone =
              score >= 80 ? 'text-success' :
              score >= 60 ? 'text-primary' :
              score >= 40 ? 'text-warning' : 'text-destructive';
            const dimBar =
              score >= 80 ? 'bg-success' :
              score >= 60 ? 'bg-primary' :
              score >= 40 ? 'bg-warning' : 'bg-destructive';
            return (
              <Tooltip key={d.key}>
                <TooltipTrigger asChild>
                  <div
                    className="rounded-xl border border-border/60 bg-background/60 p-3 cursor-help transition-colors hover:bg-background"
                    role="group"
                    aria-label={`${pickBi(isRTL, meta.ar, meta.en)}: ${score}/100`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Icon className={`h-3.5 w-3.5 shrink-0 ${dimTone}`} />
                        <span className="text-[11.5px] font-medium text-foreground truncate">
                          {pickBi(isRTL, meta.ar, meta.en)}
                        </span>
                      </div>
                      <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">
                        {Math.round(d.weight * 100)}%
                      </span>
                    </div>
                    <div className="mt-1.5 flex items-baseline gap-1 tech-content">
                      <span className={`text-xl font-heading font-bold tabular-nums leading-none ${dimTone}`}>
                        {score}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-normal tabular-nums">
                        /100
                      </span>
                    </div>
                    <div className="mt-0.5 text-[10px] text-muted-foreground tabular-nums tech-content truncate">
                      {d.numerator}{d.key === 'completeness' ? '%' : ''} / {d.denominator}
                    </div>
                    <div className="mt-1.5 h-1 w-full rounded-full bg-muted/60 overflow-hidden">
                      <div className={`h-full ${dimBar} transition-all`} style={{ width: `${score}%` }} />
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs text-xs">
                  <p className="font-semibold mb-1">{pickBi(isRTL, meta.ar, meta.en)}</p>
                  <p className="text-muted-foreground">
                    {pickBi(isRTL, meta.formulaAr, meta.formulaEn)}
                  </p>
                  <p className="mt-1 text-muted-foreground tech-content">
                    {pickBi(isRTL, 'المصدر:', 'Source:')} {d.source}
                  </p>
                  <p className="mt-1 text-muted-foreground tech-content">
                    {pickBi(isRTL, 'الوزن:', 'Weight:')} {Math.round(d.weight * 100)}%
                  </p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </div>
    </Card>
    </TooltipProvider>
  );
});
HealthScoreCard.displayName = 'HealthScoreCard';

export default HealthScoreCard;