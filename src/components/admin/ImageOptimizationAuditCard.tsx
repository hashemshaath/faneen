/**
 * Phase 2.4 — Image Optimization Audit card.
 *
 * Read-only admin card. Surfaces counts of legacy images that have no
 * optimized `image_asset_id` yet, plus a small sample of candidates.
 *
 * No execute / backfill button is rendered — the actual batched
 * backfill is intentionally deferred to a later phase.
 */
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ImageIcon, AlertTriangle } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import {
  loadImageOptimizationAudit,
  type ImageAuditCounts,
} from '@/modules/files/services/imageOptimizationAudit';

const COUNT_LABELS: Record<
  keyof Omit<ImageAuditCounts, 'total_legacy'>,
  { ar: string; en: string }
> = {
  showcase_legacy: { ar: 'Showcase قديمة', en: 'Showcase legacy' },
  projects_cover_legacy: { ar: 'أغلفة مشاريع', en: 'Project covers' },
  project_images_legacy: { ar: 'صور معرض المشاريع', en: 'Project gallery' },
  business_logos_legacy: { ar: 'شعارات منشآت', en: 'Business logos' },
  business_covers_legacy: { ar: 'أغلفة منشآت', en: 'Business covers' },
  brand_products_legacy: { ar: 'منتجات', en: 'Products' },
  business_services_legacy: { ar: 'خدمات', en: 'Services' },
};

export const ImageOptimizationAuditCard: React.FC = () => {
  const { isRTL } = useLanguage();
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-image-optimization-audit'],
    queryFn: loadImageOptimizationAudit,
    staleTime: 5 * 60 * 1000,
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <ImageIcon className="w-4 h-4" />
          {isRTL ? 'تقرير تحسين الصور' : 'Image Optimization Report'}
          <Badge variant="outline" className="text-[10px]">
            {isRTL ? 'للعرض فقط' : 'Read-only'}
          </Badge>
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          {isRTL
            ? 'صور قديمة لا تحتوي على variants محسّنة. لا يوجد تنفيذ تلقائي — backfill مؤجل لمرحلة لاحقة.'
            : 'Legacy images without optimized variants. No automatic execution — backfill is deferred to a later phase.'}
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : error ? (
          <div className="flex items-center gap-2 text-xs text-destructive">
            <AlertTriangle className="w-3.5 h-3.5" />
            {error instanceof Error ? error.message : String(error)}
          </div>
        ) : data ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(
                Object.keys(COUNT_LABELS) as Array<keyof typeof COUNT_LABELS>
              ).map((key) => (
                <div
                  key={key}
                  className="border rounded-xl p-2.5 bg-muted/20"
                >
                  <div className="text-[10px] text-muted-foreground truncate">
                    {isRTL ? COUNT_LABELS[key].ar : COUNT_LABELS[key].en}
                  </div>
                  <div className="text-lg font-semibold tech-content">
                    {data.counts[key] ?? 0}
                  </div>
                </div>
              ))}
              <div className="border rounded-xl p-2.5 bg-primary/5 border-primary/30">
                <div className="text-[10px] text-muted-foreground truncate">
                  {isRTL ? 'الإجمالي' : 'Total'}
                </div>
                <div className="text-lg font-semibold tech-content">
                  {data.counts.total_legacy ?? 0}
                </div>
              </div>
            </div>

            {data.sample.length > 0 && (
              <div className="border rounded-xl overflow-hidden">
                <div className="px-3 py-2 text-xs font-semibold bg-muted/30">
                  {isRTL
                    ? `عيّنة أعلى ${data.sample.length} مرشحاً للمعالجة`
                    : `Top ${data.sample.length} candidates`}
                </div>
                <div className="divide-y text-xs">
                  {data.sample.map((row, i) => (
                    <div
                      key={`${row.source_table}-${row.record_id}-${i}`}
                      className="px-3 py-2 flex items-center gap-2 flex-wrap"
                    >
                      <Badge
                        variant="outline"
                        className="text-[10px] tech-content"
                      >
                        {row.source_table}
                      </Badge>
                      <code className="tech-content text-[10px] text-muted-foreground truncate max-w-[10rem]">
                        {row.record_id}
                      </code>
                      <span className="text-[10px] text-muted-foreground">
                        · {row.suggested_kind}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        · p={row.estimated_priority}
                      </span>
                      <a
                        href={row.image_url}
                        target="_blank"
                        rel="noreferrer"
                        className="tech-content text-[10px] underline truncate flex-1 min-w-[8rem]"
                      >
                        {row.image_url}
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <p className="text-[10px] text-muted-foreground">
              {isRTL
                ? 'الخطة المستقبلية: تشغيل backfill بدفعات 25–50 صورة، idempotent، يتخطّى الصور التي تمتلك asset مسبقاً، يسجّل الإخفاقات، ولا يحذف الأصول الأصلية.'
                : 'Planned backfill: batches of 25–50, idempotent, skips rows that already have an asset, logs failures, never deletes the original image.'}
            </p>
            <p className="text-[10px] text-muted-foreground/70">
              {isRTL ? 'آخر تحديث:' : 'Generated at:'}{' '}
              <span className="tech-content">{data.generated_at}</span>
            </p>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
};

export default ImageOptimizationAuditCard;