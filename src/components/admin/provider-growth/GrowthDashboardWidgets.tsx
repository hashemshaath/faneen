/**
 * PROVIDER-GROWTH-ENGINE-2 — Dashboard widgets.
 * Pure presentational; data comes from props. No supabase imports.
 */
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import {
  type GrowthBusinessRow,
  type GrowthDirectoryKPIs,
  type GrowthStage,
  type ProviderGrowthInsight,
  GROWTH_STAGES,
  buildProviderInsight,
} from '@/modules/providers/services/providerGrowthQueries';

const STAGE_LABEL: Record<GrowthStage, { ar: string; en: string }> = {
  discovered: { ar: 'مكتشف', en: 'Discovered' },
  imported: { ar: 'مستورد', en: 'Imported' },
  enriched: { ar: 'مُثرى', en: 'Enriched' },
  review_pending: { ar: 'بانتظار المراجعة', en: 'Review pending' },
  verified: { ar: 'موثّق', en: 'Verified' },
  published: { ar: 'منشور', en: 'Published' },
  rejected: { ar: 'مرفوض', en: 'Rejected' },
  archived: { ar: 'مؤرشف', en: 'Archived' },
};

const t = (isRTL: boolean, ar: string, en: string) => (isRTL ? ar : en);

/* ────────── KPI summary ────────── */
export const KpiSummary: React.FC<{ kpis: GrowthDirectoryKPIs }> = ({ kpis }) => {
  const { isRTL } = useLanguage();
  const items: Array<{ key: string; label: string; value: number | string }> = [
    { key: 'total', label: t(isRTL, 'إجمالي المزودين', 'Total providers'), value: kpis.totalProviders },
    { key: 'published', label: t(isRTL, 'المنشورون', 'Published'), value: kpis.publishedProviders },
    { key: 'verified', label: t(isRTL, 'الموثّقون', 'Verified'), value: kpis.verifiedProviders },
    { key: 'ready', label: t(isRTL, 'جاهزون للنشر', 'Ready to publish'), value: kpis.readyToPublish },
    { key: 'avg-readiness', label: t(isRTL, 'متوسط الجاهزية', 'Avg readiness'), value: `${kpis.averageReadiness}/100` },
    { key: 'avg-quality', label: t(isRTL, 'متوسط الجودة', 'Avg quality'), value: `${kpis.averageQuality}/100` },
  ];
  return (
    <div data-testid="growth-kpi-summary" className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {items.map((i) => (
        <Card key={i.key} className="rounded-xl">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">{i.label}</div>
            <div className="text-2xl font-bold mt-1 tech-content">{i.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

/* ────────── Pipeline Funnel ────────── */
export const PipelineFunnelWidget: React.FC<{ byStage: Record<GrowthStage, number> }> = ({ byStage }) => {
  const { isRTL } = useLanguage();
  const max = Math.max(1, ...GROWTH_STAGES.map((s) => byStage[s] ?? 0));
  return (
    <Card data-testid="widget-pipeline-funnel" className="rounded-xl">
      <CardContent className="p-5">
        <h3 className="text-sm font-semibold mb-3">{t(isRTL, 'مسار النمو', 'Pipeline funnel')}</h3>
        <div className="space-y-2">
          {GROWTH_STAGES.map((s) => {
            const n = byStage[s] ?? 0;
            const pct = Math.round((n / max) * 100);
            return (
              <div key={s} className="flex items-center gap-3">
                <div className="w-32 text-xs text-muted-foreground">{t(isRTL, STAGE_LABEL[s].ar, STAGE_LABEL[s].en)}</div>
                <div className="flex-1 h-3 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                </div>
                <div className="w-12 text-end tech-content text-sm">{n}</div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

/* ────────── Distribution widgets ────────── */
function distribute<T>(rows: T[], pick: (r: T) => number, buckets: Array<{ label: { ar: string; en: string }; max: number }>) {
  const out = buckets.map((b) => ({ ...b, count: 0 }));
  for (const r of rows) {
    const v = pick(r);
    for (const b of out) {
      if (v <= b.max) { b.count += 1; break; }
    }
  }
  return out;
}

export const ReadinessDistribution: React.FC<{ insights: ProviderGrowthInsight[] }> = ({ insights }) => {
  const { isRTL } = useLanguage();
  const buckets = distribute(insights, (i) => i.readiness.score, [
    { label: { ar: 'ضعيف', en: 'Poor' }, max: 39 },
    { label: { ar: 'يحتاج عمل', en: 'Needs work' }, max: 59 },
    { label: { ar: 'جيد', en: 'Good' }, max: 79 },
    { label: { ar: 'جاهز', en: 'Ready' }, max: 100 },
  ]);
  return (
    <Card data-testid="widget-readiness-distribution" className="rounded-xl">
      <CardContent className="p-5">
        <h3 className="text-sm font-semibold mb-3">{t(isRTL, 'توزيع الجاهزية', 'Readiness distribution')}</h3>
        <div className="grid grid-cols-4 gap-3">
          {buckets.map((b) => (
            <div key={b.max} className="rounded-lg border p-3 text-center">
              <div className="text-xs text-muted-foreground">{t(isRTL, b.label.ar, b.label.en)}</div>
              <div className="text-xl font-bold tech-content mt-1">{b.count}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export const QualityDistribution: React.FC<{ insights: ProviderGrowthInsight[] }> = ({ insights }) => {
  const { isRTL } = useLanguage();
  const buckets = distribute(insights, (i) => i.quality.score, [
    { label: { ar: 'ضعيف', en: 'Poor' }, max: 49 },
    { label: { ar: 'مقبول', en: 'Fair' }, max: 69 },
    { label: { ar: 'جيد', en: 'Good' }, max: 84 },
    { label: { ar: 'ممتاز', en: 'Excellent' }, max: 100 },
  ]);
  return (
    <Card data-testid="widget-quality-distribution" className="rounded-xl">
      <CardContent className="p-5">
        <h3 className="text-sm font-semibold mb-3">{t(isRTL, 'توزيع الجودة', 'Quality distribution')}</h3>
        <div className="grid grid-cols-4 gap-3">
          {buckets.map((b) => (
            <div key={b.max} className="rounded-lg border p-3 text-center">
              <div className="text-xs text-muted-foreground">{t(isRTL, b.label.ar, b.label.en)}</div>
              <div className="text-xl font-bold tech-content mt-1">{b.count}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

/* ────────── Missing data widget ────────── */
export const MissingDataWidget: React.FC<{ rows: GrowthBusinessRow[] }> = ({ rows }) => {
  const { isRTL } = useLanguage();
  const items = [
    { key: 'logo', ar: 'بدون شعار', en: 'Missing logo', n: rows.filter((b) => !b.logo_url).length },
    { key: 'services', ar: 'بدون قطاعات', en: 'Missing services', n: rows.filter((b) => b.sectors.length === 0).length },
    { key: 'brands', ar: 'بدون علامات', en: 'Missing brands', n: rows.filter((b) => b.brands_count === 0).length },
    { key: 'website', ar: 'بدون موقع', en: 'Missing website', n: rows.filter((b) => !b.website).length },
    { key: 'address', ar: 'بدون عنوان', en: 'Missing address', n: rows.filter((b) => !b.address).length },
    { key: 'city', ar: 'بدون مدينة', en: 'Missing city', n: rows.filter((b) => !b.city_id).length },
    { key: 'images', ar: 'بدون صور', en: 'Missing images', n: rows.filter((b) => !b.logo_url && b.gallery_count === 0).length },
  ];
  return (
    <Card data-testid="widget-missing-data" className="rounded-xl">
      <CardContent className="p-5">
        <h3 className="text-sm font-semibold mb-3">{t(isRTL, 'بيانات مفقودة', 'Missing data')}</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {items.map((i) => (
            <div key={i.key} className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">{t(isRTL, i.ar, i.en)}</div>
              <div className="text-lg font-bold tech-content mt-1">{i.n}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

/* ────────── Top Priority Queue ────────── */
export const TopPriorityWidget: React.FC<{
  rows: GrowthBusinessRow[];
  limit?: number;
  onSelect?: (id: string) => void;
}> = ({ rows, limit = 8, onSelect }) => {
  const { isRTL } = useLanguage();
  const insights = rows.map((r) => buildProviderInsight(r));
  // Closest to publication = highest readiness among the unpublished.
  const priority = insights
    .filter((i) => i.business.approval_status !== 'published')
    .sort((a, b) => b.readiness.score - a.readiness.score)
    .slice(0, limit);
  return (
    <Card data-testid="widget-top-priority" className="rounded-xl">
      <CardContent className="p-5">
        <h3 className="text-sm font-semibold mb-3">{t(isRTL, 'أعلى أولوية للنشر', 'Top priority to publish')}</h3>
        {priority.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t(isRTL, 'لا توجد بيانات', 'No data')}</p>
        ) : (
          <ul className="divide-y">
            {priority.map((i) => (
              <li key={i.business.id} className="py-2 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{i.business.name_ar ?? i.business.name_en}</div>
                  <div className="text-xs text-muted-foreground tech-content">{i.business.ref_id ?? i.business.id.slice(0, 8)}</div>
                </div>
                <Badge variant="outline" className="tech-content">{i.readiness.score}/100</Badge>
                {onSelect && (
                  <button onClick={() => onSelect(i.business.id)} className="text-muted-foreground hover:text-foreground">
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};

/* ────────── Per-provider insight card ────────── */
export const ProviderInsightCard: React.FC<{ insight: ProviderGrowthInsight }> = ({ insight }) => {
  const { isRTL } = useLanguage();
  const r = insight.readiness;
  const q = insight.quality;
  return (
    <Card data-testid="provider-insight-card" className="rounded-xl">
      <CardContent className="p-5 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-base font-semibold truncate">{insight.business.name_ar ?? insight.business.name_en}</div>
            <div className="text-xs text-muted-foreground tech-content">{insight.business.ref_id}</div>
          </div>
          {insight.stage && (
            <Badge variant="secondary" className="text-xs">{t(isRTL, STAGE_LABEL[insight.stage].ar, STAGE_LABEL[insight.stage].en)}</Badge>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <ScoreBlock label={t(isRTL, 'الجاهزية', 'Readiness')} value={r.score} />
          <ScoreBlock label={t(isRTL, 'الجودة', 'Quality')} value={q.score} />
          <ScoreBlock label="SEO" value={r.components.find((c) => c.key === 'seo')?.earned ? Math.round((r.components.find((c) => c.key === 'seo')!.ratio) * 100) : 0} />
          <ScoreBlock label={t(isRTL, 'التوثيق', 'Verification')} value={insight.business.is_verified ? 100 : 0} />
        </div>
        {r.missingRequirements.length > 0 && (
          <div>
            <div className="text-xs font-medium text-muted-foreground mb-1">{t(isRTL, 'العناصر المفقودة', 'Top missing items')}</div>
            <div className="flex flex-wrap gap-1.5">
              {r.missingRequirements.slice(0, 6).map((k) => (
                <Badge key={k} variant="outline" className="text-xs">{k}</Badge>
              ))}
            </div>
          </div>
        )}
        {r.nextRecommendedAction && (
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
            <span className="font-medium">{t(isRTL, 'الإجراء التالي: ', 'Next action: ')}</span>
            {t(isRTL, r.nextRecommendedAction.ar, r.nextRecommendedAction.en)}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const ScoreBlock: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <div className="rounded-lg border p-2 text-center">
    <div className="text-[11px] text-muted-foreground">{label}</div>
    <div className="text-lg font-bold tech-content">{value}</div>
  </div>
);