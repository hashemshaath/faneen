import React from 'react';
import {
  Activity, ShieldCheck, Sparkles, FileText, Wrench, Star, Database,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { pickBi } from '@/components/common/Bilingual';

type DimKey = 'verify' | 'profile' | 'delivery' | 'catalog' | 'engagement';

interface Dimension {
  key: DimKey;
  score: number;       // 0..100
  weight: number;      // 0..1
  numerator: number;
  denominator: number;
  source: string;
}

export interface ProviderHealthInput {
  isVerified: boolean;
  profileCompletion: number;     // 0..100
  totalContracts: number;
  completedContracts: number;
  services: number;
  portfolio: number;
  avgRating: number;             // 0..5
  reviews: number;
}

interface Props {
  input: ProviderHealthInput;
  isRTL: boolean;
}

const META: Record<DimKey, {
  ar: string; en: string; icon: React.ElementType;
  formulaAr: string; formulaEn: string;
}> = {
  verify: {
    ar: 'التوثيق', en: 'Verification', icon: ShieldCheck,
    formulaAr: '١٠٠ إذا كانت المنشأة موثّقة، وإلا صفر.',
    formulaEn: '100 if business is verified, else 0.',
  },
  profile: {
    ar: 'اكتمال الملف', en: 'Profile completion', icon: Sparkles,
    formulaAr: 'نسبة اكتمال البيانات الأساسية (الاسم · الشعار · الوصف · التواصل · المنطقة).',
    formulaEn: 'Share of core fields filled (name · logo · description · contact · region).',
  },
  delivery: {
    ar: 'تسليم العقود', en: 'Contract delivery', icon: FileText,
    formulaAr: 'العقود المكتملة ÷ إجمالي العقود × ١٠٠.',
    formulaEn: 'completed / total contracts × 100.',
  },
  catalog: {
    ar: 'جاهزية الكتالوج', en: 'Catalog readiness', icon: Wrench,
    formulaAr: 'مزيج من الخدمات والأعمال السابقة (يصل ١٠٠ عند ≥٥ خدمات و≥٥ صور).',
    formulaEn: 'mix of services + portfolio (reaches 100 at ≥5 services & ≥5 items).',
  },
  engagement: {
    ar: 'التفاعل', en: 'Engagement', icon: Star,
    formulaAr: '(متوسط التقييم ÷ ٥) مرجَّحًا بعدد المراجعات (يبلغ كامله عند ≥١٠ مراجعات).',
    formulaEn: '(avg rating / 5) weighted by review count (full at ≥10 reviews).',
  },
};

const GRADE_TONE = {
  A: { ring: 'stroke-success',     text: 'text-success',     bg: 'bg-success/10'     },
  B: { ring: 'stroke-primary',     text: 'text-primary',     bg: 'bg-primary/10'     },
  C: { ring: 'stroke-warning',     text: 'text-warning',     bg: 'bg-warning/10'     },
  D: { ring: 'stroke-destructive', text: 'text-destructive', bg: 'bg-destructive/10' },
} as const;

function computeProviderHealth(i: ProviderHealthInput): {
  score: number;
  grade: keyof typeof GRADE_TONE;
  dims: Dimension[];
} {
  const verify = i.isVerified ? 100 : 0;
  const profile = Math.max(0, Math.min(100, Math.round(i.profileCompletion)));
  const delivery = i.totalContracts
    ? Math.round((i.completedContracts / i.totalContracts) * 100)
    : 0;
  const catalog = Math.min(
    100,
    Math.round((Math.min(i.services, 5) / 5) * 60 + (Math.min(i.portfolio, 5) / 5) * 40),
  );
  const reviewWeight = Math.min(i.reviews, 10) / 10;
  const engagement = Math.round((i.avgRating / 5) * 100 * reviewWeight);

  const dims: Dimension[] = [
    { key: 'verify',     score: verify,     weight: 0.20, numerator: i.isVerified ? 1 : 0, denominator: 1,                source: 'is_verified' },
    { key: 'profile',    score: profile,    weight: 0.25, numerator: profile,             denominator: 100,               source: 'name · logo · desc · contact · region' },
    { key: 'delivery',   score: delivery,   weight: 0.20, numerator: i.completedContracts, denominator: i.totalContracts,  source: "contracts.status = 'completed'" },
    { key: 'catalog',    score: catalog,    weight: 0.20, numerator: i.services + i.portfolio, denominator: 10,            source: 'services + portfolio_items' },
    { key: 'engagement', score: engagement, weight: 0.15, numerator: i.reviews,           denominator: 10,                source: 'reviews.rating × count' },
  ];
  const score = Math.round(dims.reduce((s, d) => s + d.score * d.weight, 0));
  const grade: keyof typeof GRADE_TONE =
    score >= 85 ? 'A' : score >= 70 ? 'B' : score >= 50 ? 'C' : 'D';
  return { score, grade, dims };
}

/**
 * ProviderHealthScoreCard — executive composite of a provider's
 * directory health: verification, profile completeness, contract
 * delivery, catalog readiness, and customer engagement. All values
 * are derived from already-fetched query results — no extra reads.
 */
export const ProviderHealthScoreCard: React.FC<Props> = React.memo(({ input, isRTL }) => {
  const { score, grade, dims } = React.useMemo(() => computeProviderHealth(input), [input]);
  const tone = GRADE_TONE[grade];
  const R = 38;
  const C = 2 * Math.PI * R;
  const offset = C - (score / 100) * C;

  return (
    <TooltipProvider delayDuration={120}>
      <Card className="rounded-2xl border-border/60 bg-card overflow-hidden">
        <div className="p-4 md:p-5 flex flex-col md:flex-row md:items-center gap-5">
          <div className="flex items-center gap-4 shrink-0">
            <div className="relative h-24 w-24">
              <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                <circle cx="50" cy="50" r={R} className="stroke-muted" strokeWidth="9" fill="none" />
                <circle
                  cx="50" cy="50" r={R}
                  className={`${tone.ring} transition-all`}
                  strokeWidth="9" fill="none" strokeLinecap="round"
                  strokeDasharray={C} strokeDashoffset={offset}
                />
              </svg>
              <div className="absolute inset-0 grid place-items-center">
                <div className="flex flex-col items-center leading-none">
                  <span className={`text-2xl font-heading font-bold tabular-nums ${tone.text}`}>{score}</span>
                  <span className="mt-0.5 text-[9px] text-muted-foreground tabular-nums">/100</span>
                </div>
              </div>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Activity className={`h-4 w-4 ${tone.text}`} />
                <h3 className="text-sm font-semibold text-foreground">
                  {pickBi(isRTL, 'مؤشر صحّة منشأتك', 'Your business health score')}
                </h3>
              </div>
              <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${tone.bg} ${tone.text}`}>
                  {pickBi(isRTL, 'التقدير', 'Grade')} · {grade}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {pickBi(isRTL, 'مرجّح من ٥ أبعاد', 'weighted across 5 dimensions')}
                </span>
                <span className="inline-flex items-center gap-1 text-[10.5px] font-medium text-success bg-success/10 px-1.5 py-0.5 rounded-md">
                  <Database className="h-3 w-3" />
                  {pickBi(isRTL, 'بيانات حيّة', 'live data')}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 flex-1">
            {dims.map((d) => {
              const meta = META[d.key];
              const Icon = meta.icon;
              const s = Math.round(d.score);
              const dimTone =
                s >= 80 ? 'text-success' :
                s >= 60 ? 'text-primary' :
                s >= 40 ? 'text-warning' : 'text-destructive';
              const dimBar =
                s >= 80 ? 'bg-success' :
                s >= 60 ? 'bg-primary' :
                s >= 40 ? 'bg-warning' : 'bg-destructive';
              return (
                <Tooltip key={d.key}>
                  <TooltipTrigger asChild>
                    <div
                      className="rounded-xl border border-border/60 bg-background/60 p-3 cursor-help transition-colors hover:bg-background"
                      role="group"
                      aria-label={`${pickBi(isRTL, meta.ar, meta.en)}: ${s}/100`}
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
                        <span className={`text-xl font-heading font-bold tabular-nums leading-none ${dimTone}`}>{s}</span>
                        <span className="text-[10px] text-muted-foreground font-normal tabular-nums">/100</span>
                      </div>
                      <div className="mt-0.5 text-[10px] text-muted-foreground tabular-nums tech-content truncate">
                        {d.numerator} / {d.denominator || '—'}
                      </div>
                      <div className="mt-1.5 h-1 w-full rounded-full bg-muted/60 overflow-hidden">
                        <div className={`h-full ${dimBar} transition-all`} style={{ width: `${s}%` }} />
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs text-xs">
                    <p className="font-semibold mb-1">{pickBi(isRTL, meta.ar, meta.en)}</p>
                    <p className="text-muted-foreground">{pickBi(isRTL, meta.formulaAr, meta.formulaEn)}</p>
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
ProviderHealthScoreCard.displayName = 'ProviderHealthScoreCard';

export default ProviderHealthScoreCard;