/**
 * OPERATIONS-CENTER-UNIFICATION-1 — /admin/operations-center
 *
 * Executive summary + unified work queue + SLA board + source-system cards.
 * Reads ONLY through `unifiedOperationsQueries` — no direct Supabase here,
 * no new score engines, no mutations. Every CTA is a `<Link>` to the page
 * that owns the action.
 */
import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { useLanguage } from '@/i18n/LanguageContext';
import { useNoIndex } from '@/hooks/useNoIndex';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { HelpLauncher } from '@/components/help/HelpLauncher';
import { loadUnifiedOperationsSnapshot } from '@/modules/operations/services/unifiedOperationsQueries';
import type {
  UnifiedSlaStatus,
  UnifiedPriority,
} from '@/modules/operations/unifiedWorkQueue';

const PAGE_KEY = 'admin.operations-center-unified';

const SLA_BADGE: Record<UnifiedSlaStatus, string> = {
  ok: 'bg-emerald-100 text-emerald-800',
  warning: 'bg-amber-100 text-amber-800',
  overdue: 'bg-red-100 text-red-800',
};
const PRIORITY_BADGE: Record<UnifiedPriority, string> = {
  critical: 'bg-red-600 text-white',
  high: 'bg-orange-500 text-white',
  medium: 'bg-amber-400 text-amber-950',
  low: 'bg-muted text-foreground',
};

const AdminOperationsCenterUnified: React.FC = () => {
  const { isRTL } = useLanguage();
  useNoIndex();
  const t = (ar: string, en: string) => (isRTL ? ar : en);

  const snapQ = useQuery({
    queryKey: ['admin', 'operations-center', 'unified'],
    queryFn: () => loadUnifiedOperationsSnapshot({}),
    staleTime: 60_000,
  });
  const snap = snapQ.data;

  const topQueue = useMemo(() => {
    if (!snap) return [];
    const rank = { critical: 0, high: 1, medium: 2, low: 3 } as Record<UnifiedPriority, number>;
    return [...snap.items]
      .sort((a, b) => rank[a.priority] - rank[b.priority] || b.age_hours - a.age_hours)
      .slice(0, 25);
  }, [snap]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-7xl">
        <header className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold">
              {t('مركز العمليات الموحّد', 'Unified Operations Center')}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t(
                'عرض تنفيذي موحّد للعمليات اليومية، طابور موحّد للمهام، ومسارات سريعة للأنظمة المتخصصة.',
                'Executive snapshot, unified work queue, and quick routes into the specialised dashboards.',
              )}
            </p>
          </div>
          <HelpLauncher pageKey="admin.operations-center-unified" />
        </header>

        {snapQ.isLoading || !snap ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Executive Summary */}
            <section data-testid="executive-summary" className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <Card className="p-4">
                <div className="text-xs text-muted-foreground">{t('إجمالي العناصر', 'Total items')}</div>
                <div className="text-2xl font-bold">{snap.kpis.total}</div>
              </Card>
              <Card className="p-4">
                <div className="text-xs text-muted-foreground">{t('متأخر', 'Overdue')}</div>
                <div className="text-2xl font-bold text-red-600">{snap.kpis.overdue}</div>
              </Card>
              <Card className="p-4">
                <div className="text-xs text-muted-foreground">{t('تحذير', 'Warning')}</div>
                <div className="text-2xl font-bold text-amber-600">{snap.kpis.warning}</div>
              </Card>
              <Card className="p-4">
                <div className="text-xs text-muted-foreground">{t('ضمن المهلة', 'On track')}</div>
                <div className="text-2xl font-bold text-emerald-600">{snap.kpis.ok}</div>
              </Card>
            </section>

            {/* SLA Board */}
            <section data-testid="sla-board">
              <h2 className="text-lg font-semibold mb-3">{t('لوحة SLA', 'SLA board')}</h2>
              <div className="grid sm:grid-cols-4 gap-3">
                {(['critical','high','medium','low'] as UnifiedPriority[]).map((p) => (
                  <Card key={p} className="p-4">
                    <div className="text-xs text-muted-foreground uppercase">{p}</div>
                    <div className="text-2xl font-bold">{snap.kpis.byPriority[p]}</div>
                  </Card>
                ))}
              </div>
            </section>

            {/* Unified Work Queue */}
            <section data-testid="unified-work-queue">
              <h2 className="text-lg font-semibold mb-3">{t('طابور العمل الموحّد', 'Unified work queue')}</h2>
              <Card className="divide-y">
                {topQueue.length === 0 && (
                  <div className="p-4 text-sm text-muted-foreground">
                    {t('لا توجد عناصر حالياً.', 'No items right now.')}
                  </div>
                )}
                {topQueue.map((it) => (
                  <div key={`${it.source_system}-${it.ref}`} className="p-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{t(it.title_ar, it.title_en)}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="rounded-md">{it.source_system}</Badge>
                        <Badge className={`rounded-md ${PRIORITY_BADGE[it.priority]}`}>{it.priority}</Badge>
                        <Badge className={`rounded-md ${SLA_BADGE[it.sla_status]}`}>{it.sla_status}</Badge>
                        <span>{it.age_hours}h</span>
                      </div>
                    </div>
                    <Button asChild variant="outline" size="sm" className="rounded-xl shrink-0">
                      <Link to={it.target_route}>{t(it.action_label_ar, it.action_label_en)}</Link>
                    </Button>
                  </div>
                ))}
              </Card>
            </section>

            {/* Source System Cards (Quick Routes) */}
            <section data-testid="source-system-cards">
              <h2 className="text-lg font-semibold mb-3">{t('الأنظمة المصدرية', 'Source systems')}</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {snap.sources.map((s) => (
                  <Card key={s.system} className="p-4 flex flex-col gap-2">
                    <div className="font-medium">{t(s.label_ar, s.label_en)}</div>
                    <div className="text-xs text-muted-foreground">{s.system}</div>
                    <div className="flex gap-2 mt-2">
                      <Button asChild variant="outline" size="sm" className="rounded-xl">
                        <Link to={s.route}>{t('فتح اللوحة', 'Open dashboard')}</Link>
                      </Button>
                      {s.queue_route && (
                        <Button asChild variant="outline" size="sm" className="rounded-xl">
                          <Link to={s.queue_route}>{t('فتح الطابور', 'Open queue')}</Link>
                        </Button>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </section>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default AdminOperationsCenterUnified;