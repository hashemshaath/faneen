import React from 'react';
import { Activity, ShieldCheck, CheckCircle2, Gauge, Phone, Rocket } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { pickBi } from '@/components/common/Bilingual';
import type { HealthScore } from '@/modules/admin/businesses/businessAdminMetrics';

interface Props {
  health: HealthScore;
  isRTL: boolean;
}

const DIM_META: Record<
  HealthScore['dimensions'][number]['key'],
  { ar: string; en: string; icon: React.ElementType }
> = {
  publish:      { ar: 'النشر',         en: 'Publish',      icon: CheckCircle2 },
  verify:       { ar: 'التحقّق',        en: 'Verify',       icon: ShieldCheck  },
  completeness: { ar: 'الاكتمال',      en: 'Completeness', icon: Gauge        },
  contact:      { ar: 'تغطية التواصل', en: 'Contact',      icon: Phone        },
  pilot:        { ar: 'الجاهزية',      en: 'Pilot ready',  icon: Rocket       },
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
              <div className={`text-2xl font-heading font-bold tabular-nums ${tone.text}`}>
                {health.score}
              </div>
            </div>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Activity className={`h-4 w-4 ${tone.text}`} />
              <h3 className="text-sm font-semibold">
                {pickBi(isRTL, 'مؤشر صحّة الدليل', 'Directory health score')}
              </h3>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${tone.bg} ${tone.text}`}>
                {pickBi(isRTL, 'التقدير', 'Grade')} · {health.grade}
              </span>
              <span className="text-[11px] text-muted-foreground">
                {pickBi(isRTL, 'مرجّح من ٥ أبعاد', 'weighted across 5 dimensions')}
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
              <div
                key={d.key}
                className="rounded-xl border border-border/60 bg-background/40 p-2.5"
              >
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="text-[11px] text-muted-foreground truncate">
                      {pickBi(isRTL, meta.ar, meta.en)}
                    </span>
                  </div>
                  <span className="text-[10px] text-muted-foreground tabular-nums">
                    {Math.round(d.weight * 100)}%
                  </span>
                </div>
                <div className={`mt-1 text-lg font-heading font-bold tabular-nums ${dimTone}`}>
                  {score}
                  <span className="text-[10px] text-muted-foreground font-normal ms-0.5">/100</span>
                </div>
                <div className="mt-1 h-1 w-full rounded-full bg-muted/60 overflow-hidden">
                  <div className={`h-full ${dimBar}`} style={{ width: `${score}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
});
HealthScoreCard.displayName = 'HealthScoreCard';

export default HealthScoreCard;