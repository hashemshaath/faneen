/**
 * PROVIDER-GROWTH-ENGINE-2 — Operations queue at /admin/provider-growth/queue.
 *
 * Bulk actions are limited to: assign reviewer, request enrichment,
 * request verification. NEVER bulk publish.
 */
import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { useLanguage } from '@/i18n/LanguageContext';
import { useNoIndex } from '@/hooks/useNoIndex';
import { Loader2, UserCheck, Sparkles, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { HelpLauncher } from '@/components/help/HelpLauncher';
import {
  loadProviderGrowthBusinesses,
  loadProviderGrowthPipeline,
  buildProviderInsight,
  filterGrowthInsights,
  GROWTH_QUEUE_FILTERS,
  type GrowthQueueFilter,
  type GrowthPipelineRow,
} from '@/modules/providers/services/providerGrowthQueries';
import { ProviderInsightCard } from '@/components/admin/provider-growth/GrowthDashboardWidgets';

const PAGE_KEY = 'admin.provider-growth-queue';

const FILTER_LABEL: Record<GrowthQueueFilter, { ar: string; en: string }> = {
  all: { ar: 'الكل', en: 'All' },
  missing_logo: { ar: 'بدون شعار', en: 'Missing logo' },
  missing_services: { ar: 'بدون خدمات', en: 'Missing services' },
  missing_brands: { ar: 'بدون علامات', en: 'Missing brands' },
  missing_address: { ar: 'بدون عنوان', en: 'Missing address' },
  low_quality: { ar: 'جودة منخفضة', en: 'Low quality' },
  low_readiness: { ar: 'جاهزية منخفضة', en: 'Low readiness' },
  pending_verification: { ar: 'بانتظار التوثيق', en: 'Pending verification' },
  pending_enrichment: { ar: 'بانتظار الإثراء', en: 'Pending enrichment' },
};

const AdminProviderGrowthQueue: React.FC = () => {
  const { isRTL } = useLanguage();
  useNoIndex();
  const t = (ar: string, en: string) => (isRTL ? ar : en);
  const [filter, setFilter] = useState<GrowthQueueFilter>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const businessesQ = useQuery({
    queryKey: ['admin', 'provider-growth', 'queue', 'businesses'],
    queryFn: () => loadProviderGrowthBusinesses({ limit: 500 }),
    staleTime: 60_000,
  });
  const pipelineQ = useQuery({
    queryKey: ['admin', 'provider-growth', 'queue', 'pipeline'],
    queryFn: () => loadProviderGrowthPipeline(),
    staleTime: 60_000,
  });

  const pipelineByBiz = useMemo(() => {
    const map = new Map<string, GrowthPipelineRow>();
    for (const r of pipelineQ.data?.rows ?? []) {
      if (r.business_id) map.set(r.business_id, r);
    }
    return map;
  }, [pipelineQ.data]);

  const insights = useMemo(
    () => (businessesQ.data?.rows ?? []).map((b) => buildProviderInsight(b, pipelineByBiz.get(b.id))),
    [businessesQ.data, pipelineByBiz],
  );
  const filtered = useMemo(() => filterGrowthInsights(insights, filter), [insights, filter]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const onBulk = (label: string) => {
    if (selected.size === 0) {
      toast.error(t('اختر صفًا واحدًا على الأقل', 'Select at least one row'));
      return;
    }
    toast.success(t(`${label} — ${selected.size} عنصر (سيتم في المرحلة التالية)`, `${label} — ${selected.size} items (queued for next phase)`));
  };

  const loading = businessesQ.isLoading || pipelineQ.isLoading;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-7xl">
        <header className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold">{t('قائمة عمليات نمو المزودين', 'Provider growth queue')}</h1>
            <p className="text-sm text-muted-foreground">
              {t('فلترة المزودين بحسب البيانات المفقودة أو الجودة المنخفضة، وتنفيذ إجراءات مجمعة (بدون نشر مجمع).',
                 'Filter providers by missing data or low quality, then run bulk actions (no bulk publishing).')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <HelpLauncher pageKey={PAGE_KEY} />
            <Button asChild variant="outline" className="rounded-xl">
              <Link to="/admin/provider-growth">{t('عودة للوحة', 'Back to dashboard')}</Link>
            </Button>
          </div>
        </header>

        {/* Filters */}
        <div data-testid="queue-filters" className="flex flex-wrap gap-2 mb-5">
          {GROWTH_QUEUE_FILTERS.map((f) => (
            <button
              key={f}
              data-testid={`queue-filter-${f}`}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-xl text-sm border transition ${
                filter === f ? 'bg-primary text-primary-foreground border-primary' : 'bg-background hover:bg-muted'
              }`}
            >
              {t(FILTER_LABEL[f].ar, FILTER_LABEL[f].en)}
            </button>
          ))}
        </div>

        {/* Bulk actions */}
        <div data-testid="queue-bulk-actions" className="flex flex-wrap gap-2 mb-5">
          <Button variant="outline" className="rounded-xl gap-2" onClick={() => onBulk(t('تعيين مراجع', 'Assign reviewer'))}>
            <UserCheck className="w-4 h-4" /> {t('تعيين مراجع', 'Assign reviewer')}
          </Button>
          <Button variant="outline" className="rounded-xl gap-2" onClick={() => onBulk(t('طلب إثراء', 'Request enrichment'))}>
            <Sparkles className="w-4 h-4" /> {t('طلب إثراء', 'Request enrichment')}
          </Button>
          <Button variant="outline" className="rounded-xl gap-2" onClick={() => onBulk(t('طلب توثيق', 'Request verification'))}>
            <ShieldCheck className="w-4 h-4" /> {t('طلب توثيق', 'Request verification')}
          </Button>
          <div className="text-xs text-muted-foreground self-center ms-2">
            {t('النشر المجمع غير مدعوم — يتم النشر فرديًا بعد التوثيق.',
               'Bulk publishing is not supported — publish individually after verification.')}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-12">{t('لا توجد عناصر مطابقة', 'No matching items')}</p>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {filtered.slice(0, 60).map((i) => (
              <div key={i.business.id} className="relative">
                <div className="absolute top-3 start-3 z-10">
                  <Checkbox
                    checked={selected.has(i.business.id)}
                    onCheckedChange={() => toggle(i.business.id)}
                    aria-label={t('تحديد', 'Select')}
                  />
                </div>
                <ProviderInsightCard insight={i} />
              </div>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default AdminProviderGrowthQueue;