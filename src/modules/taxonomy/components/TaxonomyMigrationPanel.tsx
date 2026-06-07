/**
 * Phase 8 — Taxonomy unification dashboard panel.
 * Shows the inventory snapshot, the legacy mapping registry, and the
 * read-only backfill preview. Admin-only by virtue of the route.
 */
import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useLanguage } from '@/i18n/LanguageContext';
import { AlertTriangle, CheckCircle2, RefreshCw, Database, ArrowRightLeft, Eye, PlayCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  getTaxonomyInventory,
  listLegacyMappings,
  updateLegacyMapping,
  previewTaxonomyBackfill,
  applyTaxonomyBackfill,
  clearRuntimeLegacyMapCache,
  previewBusinessSecondaryBackfill,
  applyBusinessSecondaryBackfill,
  type BackfillApplyResult,
  type SecondaryBackfillApplyResult,
  type LegacyMappingRow,
  type LegacyMappingStatus,
} from '../migration-services';
import { getTaxonomyCategories } from '../services';
import type { TaxonomyCategory } from '../types';

const STATUS_LABELS: Record<LegacyMappingStatus, { ar: string; en: string; tone: string }> = {
  mapped:       { ar: 'مربوط',       en: 'Mapped',       tone: 'bg-emerald-500/15 text-emerald-700' },
  pending:      { ar: 'قيد الانتظار', en: 'Pending',      tone: 'bg-amber-500/15 text-amber-700' },
  needs_review: { ar: 'يحتاج مراجعة', en: 'Needs review', tone: 'bg-orange-500/15 text-orange-700' },
  ignored:      { ar: 'مُتجاهَل',     en: 'Ignored',      tone: 'bg-muted text-muted-foreground' },
  archived:     { ar: 'مؤرشف',       en: 'Archived',     tone: 'bg-muted text-muted-foreground' },
};

function Stat({ label, value, tone }: { label: string; value: number | string; tone?: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/95 p-3">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className={`text-lg font-bold tech-content ${tone ?? ''}`}>{value}</div>
    </div>
  );
}

export const TaxonomyMigrationPanel: React.FC = () => {
  const { isRTL } = useLanguage();
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<'all' | LegacyMappingStatus>('all');
  const [applying, setApplying] = useState(false);
  const [confirmingApply, setConfirmingApply] = useState(false);
  const [lastApplyResult, setLastApplyResult] = useState<BackfillApplyResult | null>(null);
  const [applyingSecondary, setApplyingSecondary] = useState(false);
  const [confirmingSecondary, setConfirmingSecondary] = useState(false);
  const [lastSecondaryResult, setLastSecondaryResult] = useState<SecondaryBackfillApplyResult | null>(null);

  const inventoryQ = useQuery({
    queryKey: ['taxonomy', 'inventory'],
    queryFn: getTaxonomyInventory,
    staleTime: 60_000,
  });
  const mappingsQ = useQuery({
    queryKey: ['taxonomy', 'legacy-mappings', statusFilter],
    queryFn: () => listLegacyMappings(statusFilter === 'all' ? undefined : { status: statusFilter }),
    staleTime: 30_000,
  });
  const catsQ = useQuery({
    queryKey: ['taxonomy', 'categories', 'all'],
    queryFn: getTaxonomyCategories,
    staleTime: 5 * 60_000,
  });
  const previewQ = useQuery({
    queryKey: ['taxonomy', 'backfill-preview'],
    queryFn: previewTaxonomyBackfill,
    staleTime: 60_000,
    retry: 1,
  });
  const secondaryQ = useQuery({
    queryKey: ['taxonomy', 'secondary-backfill-preview'],
    queryFn: previewBusinessSecondaryBackfill,
    staleTime: 60_000,
    retry: 1,
  });

  const catsById = useMemo(() => {
    const m = new Map<string, TaxonomyCategory>();
    for (const c of catsQ.data ?? []) m.set(c.id, c);
    return m;
  }, [catsQ.data]);

  const handleUpdate = async (
    id: string,
    patch: Partial<Pick<LegacyMappingRow, 'taxonomy_category_id' | 'mapping_status'>>,
  ) => {
    try {
      await updateLegacyMapping(id, patch);
      await qc.invalidateQueries({ queryKey: ['taxonomy', 'legacy-mappings'] });
      await qc.invalidateQueries({ queryKey: ['taxonomy', 'inventory'] });
      toast.success(isRTL ? 'تم التحديث' : 'Updated');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    }
  };

  const refreshAll = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['taxonomy', 'inventory'] }),
      qc.invalidateQueries({ queryKey: ['taxonomy', 'legacy-mappings'] }),
      qc.invalidateQueries({ queryKey: ['taxonomy', 'backfill-preview'] }),
      qc.invalidateQueries({ queryKey: ['taxonomy', 'secondary-backfill-preview'] }),
    ]);
  };

  const inv = inventoryQ.data;
  const preview = previewQ.data;

  const canApply = Boolean(
    preview &&
      ((preview.businesses_resolvable ?? 0) > 0 ||
        (preview.showcase_resolvable ?? 0) > 0),
  );

  const handleApply = async () => {
    setApplying(true);
    try {
      const result = await applyTaxonomyBackfill();
      setLastApplyResult(result);
      clearRuntimeLegacyMapCache();
      toast.success(
        isRTL
          ? `تم الربط: ${result.businesses_linked} منشأة و ${result.showcase_linked} عمل`
          : `Linked ${result.businesses_linked} businesses & ${result.showcase_linked} showcase items`,
      );
      await refreshAll();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setApplying(false);
      setConfirmingApply(false);
    }
  };

  const handleApplySecondary = async () => {
    setApplyingSecondary(true);
    try {
      const r = await applyBusinessSecondaryBackfill();
      setLastSecondaryResult(r);
      clearRuntimeLegacyMapCache();
      toast.success(
        isRTL
          ? `تم ربط ${r.secondary_linked} تخصص فرعي`
          : `Linked ${r.secondary_linked} secondary activities`,
      );
      await refreshAll();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setApplyingSecondary(false);
      setConfirmingSecondary(false);
    }
  };

  const secondary = secondaryQ.data;
  const canApplySecondary = Boolean(secondary && secondary.totals.secondary_resolvable > 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5 text-primary" />
            {isRTL ? 'الهجرة والتوحيد' : 'Migration & Unification'}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isRTL
              ? 'المصدر الرسمي الوحيد لمطابقة التصنيفات القديمة مع التصنيفات المركزية. القديم يبقى كاحتياط حتى تكتمل الهجرة.'
              : 'The single source of truth that maps legacy values to central taxonomy. Legacy stays as a safety net until migration completes.'}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={refreshAll} className="gap-1.5">
          <RefreshCw className="w-3.5 h-3.5" />{isRTL ? 'تحديث' : 'Refresh'}
        </Button>
      </div>

      {/* Inventory */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Database className="w-4 h-4" />
            {isRTL ? 'تقرير مصادر التصنيف' : 'Taxonomy sources inventory'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {inventoryQ.isLoading || !inv ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <Stat label={isRTL ? 'تصنيفات مركزية' : 'Central taxonomy'} value={inv.taxonomyCategories} />
              <Stat label={isRTL ? 'تصنيفات قديمة' : 'Legacy categories'} value={inv.legacyCategories} />
              <Stat label={isRTL ? 'وسوم قديمة' : 'Legacy tags'} value={inv.legacyTags} />
              <Stat label={isRTL ? 'منشآت مرتبطة بالجديد' : 'Linked to taxonomy'} value={inv.businessesWithTaxonomy} />
              <Stat label={isRTL ? 'منشآت بلا taxonomy' : 'Legacy-only businesses'} value={inv.businessesWithLegacyOnly} tone="text-amber-600" />
              <Stat label={isRTL ? 'خدمات على تصنيف قديم' : 'Services on legacy category'} value={inv.servicesWithLegacyCategory} />
              <Stat label={isRTL ? 'Showcase بلا taxonomy' : 'Showcase missing taxonomy'} value={inv.showcaseWithoutTaxonomy} />
              <Stat label={isRTL ? 'طلبات بقطاع قديم' : 'Quote reqs (legacy sector)'} value={inv.quoteRequestsWithLegacySector} />
              <Stat label={isRTL ? 'mapping مربوط' : 'Mappings mapped'} value={inv.mappingsMapped} tone="text-emerald-600" />
              <Stat label={isRTL ? 'يحتاج مراجعة' : 'Needs review'} value={inv.mappingsNeedsReview} tone="text-orange-600" />
              <Stat label={isRTL ? 'قيد الانتظار' : 'Pending'} value={inv.mappingsPending} tone="text-amber-600" />
              <Stat label={isRTL ? 'تصنيفات غير مستخدمة' : 'Unused taxonomy'} value={inv.unusedTaxonomy} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Backfill preview */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Eye className="w-4 h-4" />
            {isRTL ? 'معاينة الـ Backfill (قراءة فقط)' : 'Backfill preview (read-only)'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {previewQ.isLoading || !preview ? (
            <Skeleton className="h-20" />
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <Stat label={isRTL ? 'منشآت قابلة للربط' : 'Resolvable businesses'} value={preview.businesses_resolvable} tone="text-emerald-600" />
                <Stat label={isRTL ? 'منشآت مرتبطة بالفعل' : 'Already linked'} value={preview.businesses_already_linked ?? 0} />
                <Stat label={isRTL ? 'منشآت بلا taxonomy' : 'Businesses w/o taxonomy'} value={preview.businesses_with_legacy_no_taxonomy} />
                <Stat label={isRTL ? 'Showcase قابل للربط' : 'Showcase resolvable'} value={preview.showcase_resolvable ?? 0} tone="text-emerald-600" />
                <Stat label={isRTL ? 'Showcase بلا taxonomy' : 'Showcase w/o taxonomy'} value={preview.showcase_without_taxonomy} />
                <Stat label={isRTL ? 'خدمات على تصنيف قديم' : 'Services (legacy cat)'} value={preview.business_services_with_legacy_category} />
                <Stat label={isRTL ? 'mapping جاهز' : 'Mappings ready'} value={preview.mappings_ready ?? 0} tone="text-emerald-600" />
                <Stat label={isRTL ? 'يحتاج مراجعة' : 'Needs review'} value={preview.mappings_pending_review} tone="text-orange-600" />
              </div>

              {preview.sample && preview.sample.length > 0 && (
                <div className="mt-4 rounded-xl border border-border/60 overflow-hidden">
                  <div className="px-3 py-2 text-[11px] text-muted-foreground bg-muted/40">
                    {isRTL ? `أول ${preview.sample.length} عنصر سيتم ربطه` : `First ${preview.sample.length} records to be linked`}
                  </div>
                  <div className="overflow-x-auto max-h-56">
                    <table className="w-full text-[11px]">
                      <thead className="text-muted-foreground sticky top-0 bg-card">
                        <tr className="border-b border-border/60">
                          <th className="text-start py-1.5 px-2">{isRTL ? 'النوع' : 'Type'}</th>
                          <th className="text-start py-1.5 px-2">{isRTL ? 'المصدر' : 'Source'}</th>
                          <th className="text-start py-1.5 px-2">{isRTL ? 'القيمة القديمة' : 'Legacy'}</th>
                          <th className="text-start py-1.5 px-2">{isRTL ? 'التصنيف الجديد' : 'Target'}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {preview.sample.map((s, i) => (
                          <tr key={`${s.record_type}-${s.record_id}-${i}`} className="border-b border-border/40">
                            <td className="py-1 px-2 tech-content">{s.record_type}</td>
                            <td className="py-1 px-2 tech-content text-muted-foreground">{s.source}</td>
                            <td className="py-1 px-2 tech-content">{s.legacy_value ?? '—'}</td>
                            <td className="py-1 px-2">
                              {isRTL ? (s.target_name_ar ?? s.target_slug) : s.target_slug}
                              <span className="opacity-50 tech-content ms-1">{s.target_slug}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-[12px] leading-relaxed">
                <p className="text-amber-700 dark:text-amber-400 flex items-start gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  {isRTL
                    ? 'سيتم ربط البيانات القديمة بالتصنيفات المركزية دون حذف أي بيانات قديمة. سيتم تخطّي العناصر التي تحتاج مراجعة أو المرتبطة مسبقًا.'
                    : 'Legacy data will be linked to central taxonomy without deleting anything. Items pending review or already linked will be skipped.'}
                </p>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                {!confirmingApply ? (
                  <Button
                    size="sm"
                    onClick={() => setConfirmingApply(true)}
                    disabled={!canApply || applying}
                    className="gap-1.5"
                  >
                    <PlayCircle className="w-3.5 h-3.5" />
                    {isRTL ? 'تطبيق الربط الآمن' : 'Apply safe backfill'}
                  </Button>
                ) : (
                  <>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={handleApply}
                      disabled={applying}
                      className="gap-1.5"
                    >
                      {applying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                      {isRTL ? 'تأكيد التطبيق' : 'Confirm apply'}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setConfirmingApply(false)} disabled={applying}>
                      {isRTL ? 'إلغاء' : 'Cancel'}
                    </Button>
                  </>
                )}
                {!canApply && (
                  <span className="text-[11px] text-muted-foreground">
                    {isRTL ? 'لا توجد عناصر قابلة للتطبيق حاليًا' : 'No items eligible for backfill right now'}
                  </span>
                )}
              </div>

              {lastApplyResult && (
                <div className="mt-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 text-[12px]">
                  <div className="font-medium text-emerald-700 dark:text-emerald-400 mb-1 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {isRTL ? 'تم تطبيق الربط الآمن بنجاح' : 'Safe backfill applied successfully'}
                  </div>
                  <ul className="space-y-0.5 text-muted-foreground tech-content">
                    <li>businesses_linked: {lastApplyResult.businesses_linked}</li>
                    <li>showcase_linked: {lastApplyResult.showcase_linked}</li>
                    <li>skipped_existing: {lastApplyResult.skipped_existing}</li>
                    <li>skipped_needs_review: {lastApplyResult.skipped_needs_review}</li>
                  </ul>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Mapping registry */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-sm">{isRTL ? 'سجل المطابقات' : 'Legacy mapping registry'}</CardTitle>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
            <SelectTrigger className="w-44 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{isRTL ? 'كل الحالات' : 'All statuses'}</SelectItem>
              {(Object.keys(STATUS_LABELS) as LegacyMappingStatus[]).map((s) => (
                <SelectItem key={s} value={s}>{isRTL ? STATUS_LABELS[s].ar : STATUS_LABELS[s].en}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {mappingsQ.isLoading ? (
            <Skeleton className="h-64" />
          ) : (mappingsQ.data ?? []).length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-8">
              {isRTL ? 'لا توجد مطابقات بهذا الفلتر' : 'No mappings for this filter'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="text-muted-foreground">
                  <tr className="border-b border-border/60">
                    <th className="text-start py-2 px-2 font-medium">{isRTL ? 'المصدر' : 'Source'}</th>
                    <th className="text-start py-2 px-2 font-medium">{isRTL ? 'القيمة القديمة' : 'Legacy value'}</th>
                    <th className="text-start py-2 px-2 font-medium">{isRTL ? 'التصنيف الجديد' : 'Target taxonomy'}</th>
                    <th className="text-start py-2 px-2 font-medium">{isRTL ? 'الحالة' : 'Status'}</th>
                    <th className="text-start py-2 px-2 font-medium">{isRTL ? 'الثقة' : 'Confidence'}</th>
                    <th className="text-start py-2 px-2 font-medium">{isRTL ? 'إجراءات' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody>
                  {(mappingsQ.data ?? []).map((m) => {
                    const target = m.taxonomy_category_id ? catsById.get(m.taxonomy_category_id) : null;
                    const status = STATUS_LABELS[m.mapping_status as LegacyMappingStatus] ?? STATUS_LABELS.pending;
                    return (
                      <tr key={m.id} className="border-b border-border/40 hover:bg-muted/30">
                        <td className="py-2 px-2 tech-content">{m.legacy_source}</td>
                        <td className="py-2 px-2 tech-content font-medium">{m.legacy_slug || m.legacy_id || m.legacy_name_ar || '—'}</td>
                        <td className="py-2 px-2">
                          <Select
                            value={m.taxonomy_category_id ?? ''}
                            onValueChange={(v) => handleUpdate(m.id, {
                              taxonomy_category_id: v || null,
                              mapping_status: v ? 'mapped' : 'needs_review',
                            })}
                          >
                            <SelectTrigger className="h-7 text-xs w-56">
                              <SelectValue placeholder={isRTL ? 'اختر تصنيفًا' : 'Pick a category'}>
                                {target ? (isRTL ? target.name_ar : (target.name_en || target.name_ar)) : (isRTL ? '— غير مربوط —' : '— Unmapped —')}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {(catsQ.data ?? [])
                                .filter((c) => c.is_active && !c.is_archived && c.is_public)
                                .map((c) => (
                                  <SelectItem key={c.id} value={c.id}>
                                    {(isRTL ? c.name_ar : (c.name_en || c.name_ar))} <span className="opacity-50 tech-content">{c.slug}</span>
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="py-2 px-2">
                          <Badge className={`${status.tone} border-0`}>
                            {isRTL ? status.ar : status.en}
                          </Badge>
                        </td>
                        <td className="py-2 px-2 tech-content text-muted-foreground">{m.confidence}</td>
                        <td className="py-2 px-2">
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" className="h-7 px-2 text-[11px]"
                              onClick={() => handleUpdate(m.id, { mapping_status: 'ignored' })}>
                              {isRTL ? 'تجاهل' : 'Ignore'}
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 px-2 text-[11px]"
                              onClick={() => handleUpdate(m.id, { mapping_status: 'archived' })}>
                              {isRTL ? 'أرشف' : 'Archive'}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Migration plan */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">{isRTL ? 'خطة الهجرة' : 'Migration plan'}</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-1.5 text-sm">
            {[
              { ar: 'فحص القديم والجديد', en: 'Inventory legacy vs new', done: true },
              { ar: 'إنشاء سجل المطابقات', en: 'Build mapping registry', done: true },
              { ar: 'مراجعة التصنيفات غير المطابقة', en: 'Review unmapped values', done: inv ? inv.mappingsNeedsReview === 0 : false },
              { ar: 'ربط المنشآت غير المرتبطة', en: 'Link uncovered businesses', done: false },
              { ar: 'ربط business_services', en: 'Link business_services', done: false },
              { ar: 'ربط Showcase', en: 'Link Showcase items', done: inv ? inv.showcaseWithoutTaxonomy === 0 : false },
              { ar: 'ربط Search', en: 'Wire Search filters', done: true },
              { ar: 'ربط quote_requests', en: 'Link quote_requests', done: false },
              { ar: 'إخفاء صفحة التصنيفات القديمة', en: 'Demote legacy page', done: true },
              { ar: 'حذف القديم بعد التأكد', en: 'Drop legacy after verification', done: false },
            ].map((step, i) => (
              <li key={i} className="flex items-center gap-2">
                {step.done
                  ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  : <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />}
                <span className={step.done ? 'text-muted-foreground line-through' : ''}>
                  {i + 1}. {isRTL ? step.ar : step.en}
                </span>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
    </div>
  );
};

export default TaxonomyMigrationPanel;