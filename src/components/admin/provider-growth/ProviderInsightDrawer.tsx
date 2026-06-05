/**
 * PROVIDER-GROWTH-ENGINE-3 — Part B: per-provider insight drawer.
 *
 * Detailed subscore breakdown for a single provider. Pure presentational —
 * data comes from props (an already-computed ProviderGrowthInsight).
 */
import React from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useLanguage } from '@/i18n/LanguageContext';
import type { ProviderGrowthInsight } from '@/modules/providers/services/providerGrowthQueries';

interface Props {
  insight: ProviderGrowthInsight | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const t = (isRTL: boolean, ar: string, en: string) => (isRTL ? ar : en);

export const ProviderInsightDrawer: React.FC<Props> = ({ insight, open, onOpenChange }) => {
  const { isRTL } = useLanguage();
  if (!insight) return null;
  const r = insight.readiness;
  const q = insight.quality;
  const seo = r.components.find((c) => c.key === 'seo');
  const verification = r.components.find((c) => c.key === 'verification');

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        data-testid="provider-insight-drawer"
        side={isRTL ? 'left' : 'right'}
        className="w-full sm:max-w-lg overflow-y-auto"
      >
        <SheetHeader>
          <SheetTitle className="truncate">
            {insight.business.name_ar ?? insight.business.name_en ?? insight.business.id.slice(0, 8)}
          </SheetTitle>
          <SheetDescription className="tech-content">
            {insight.business.ref_id ?? insight.business.id.slice(0, 8)}
            {insight.stage ? ` · ${insight.stage}` : ''}
            {insight.source ? ` · ${insight.source}` : ''}
          </SheetDescription>
        </SheetHeader>

        {/* Headline scores */}
        <section data-testid="insight-headline-scores" className="grid grid-cols-2 gap-3 mt-4">
          <ScoreTile label={t(isRTL, 'الجاهزية', 'Readiness')} value={r.score} band={r.band} />
          <ScoreTile label={t(isRTL, 'الجودة', 'Quality')} value={q.score} band={q.band} />
          <ScoreTile
            label="SEO"
            value={seo ? Math.round(seo.ratio * 100) : 0}
          />
          <ScoreTile
            label={t(isRTL, 'التوثيق', 'Verification')}
            value={verification ? Math.round(verification.ratio * 100) : insight.business.is_verified ? 100 : 0}
          />
        </section>

        {/* Readiness breakdown */}
        <section data-testid="insight-readiness-breakdown" className="mt-5">
          <h4 className="text-sm font-semibold mb-2">
            {t(isRTL, 'تفاصيل الجاهزية', 'Readiness breakdown')}
          </h4>
          <ul className="space-y-2">
            {r.components.map((c) => (
              <li key={c.key} className="flex items-center gap-3 text-sm">
                <span className="w-40 text-muted-foreground">{t(isRTL, c.ar, c.en)}</span>
                <Progress value={Math.round(c.ratio * 100)} className="flex-1 h-2" />
                <span className="w-16 text-end tech-content">{c.earned}/{c.weight}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Quality breakdown */}
        <section data-testid="insight-quality-breakdown" className="mt-5">
          <h4 className="text-sm font-semibold mb-2">
            {t(isRTL, 'تفاصيل الجودة', 'Quality breakdown')}
          </h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {(Object.keys(q.penalties) as Array<keyof typeof q.penalties>).map((k) => (
              <div key={k} className="rounded-lg border p-2">
                <div className="text-xs text-muted-foreground capitalize">{k}</div>
                <div className="tech-content">-{q.penalties[k]}</div>
              </div>
            ))}
          </div>
          {q.issues.length > 0 && (
            <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
              {q.issues.slice(0, 8).map((i) => (
                <li key={i.key}>• {t(isRTL, i.ar, i.en)} <span className="tech-content">(-{i.penalty})</span></li>
              ))}
            </ul>
          )}
        </section>

        {/* Missing items */}
        {r.missingRequirements.length > 0 && (
          <section data-testid="insight-missing-items" className="mt-5">
            <h4 className="text-sm font-semibold mb-2">
              {t(isRTL, 'العناصر المفقودة', 'Missing items')}
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {r.missingRequirements.map((k) => (
                <Badge key={k} variant="outline" className="text-xs">{k}</Badge>
              ))}
            </div>
          </section>
        )}

        {/* Enrichment status */}
        <section data-testid="insight-enrichment-status" className="mt-5">
          <h4 className="text-sm font-semibold mb-2">
            {t(isRTL, 'حالة الإثراء', 'Enrichment status')}
          </h4>
          <p className="text-xs text-muted-foreground">
            {insight.source
              ? t(isRTL, `المصدر: ${insight.source}`, `Source: ${insight.source}`)
              : t(isRTL, 'لم يتم الإثراء بعد', 'Not enriched yet')}
          </p>
        </section>

        {/* Brand / service / profile gaps */}
        <section data-testid="insight-gaps" className="mt-5">
          <h4 className="text-sm font-semibold mb-2">
            {t(isRTL, 'الفجوات الرئيسية', 'Top gaps')}
          </h4>
          <ul className="text-xs space-y-1">
            <Gap on={insight.business.sectors.length === 0} ar="لا توجد قطاعات" en="No sectors" isRTL={isRTL} />
            <Gap on={insight.business.brands_count === 0} ar="لا توجد علامات تجارية" en="No brands linked" isRTL={isRTL} />
            <Gap on={!insight.business.logo_url} ar="لا يوجد شعار" en="No logo" isRTL={isRTL} />
            <Gap on={!insight.business.website} ar="لا يوجد موقع" en="No website" isRTL={isRTL} />
            <Gap on={!insight.business.address} ar="لا يوجد عنوان" en="No address" isRTL={isRTL} />
          </ul>
        </section>

        {/* Next action */}
        {r.nextRecommendedAction && (
          <section data-testid="insight-next-action" className="mt-5 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
            <div className="font-medium">{t(isRTL, 'الإجراء التالي', 'Next recommended action')}</div>
            <div className="text-muted-foreground mt-1">
              {t(isRTL, r.nextRecommendedAction.ar, r.nextRecommendedAction.en)}
            </div>
          </section>
        )}
      </SheetContent>
    </Sheet>
  );
};

const ScoreTile: React.FC<{ label: string; value: number; band?: string }> = ({ label, value, band }) => (
  <div className="rounded-lg border p-3">
    <div className="text-xs text-muted-foreground">{label}</div>
    <div className="text-2xl font-bold tech-content">{value}</div>
    {band && <div className="text-[11px] text-muted-foreground mt-1 capitalize">{band}</div>}
  </div>
);

const Gap: React.FC<{ on: boolean; ar: string; en: string; isRTL: boolean }> = ({ on, ar, en, isRTL }) =>
  on ? <li className="text-amber-700 dark:text-amber-400">• {isRTL ? ar : en}</li> : null;

export default ProviderInsightDrawer;