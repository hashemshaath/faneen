/**
 * MARKETPLACE-CONVERSION-OPTIMIZATION-1 — /admin/conversion-optimization
 *
 * Read-only conversion dashboard. Uses ONLY existing analytics tables; introduces
 * no new tracking, no mutations, no new business modules. Every widget is a
 * passive read. CTA cards are <Link>s into pages that already own the action.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { useLanguage } from '@/i18n/LanguageContext';
import { useNoIndex } from '@/hooks/useNoIndex';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { HelpLauncher } from '@/components/help/HelpLauncher';
import { Loader2, TrendingUp, Users, FileText, ShieldCheck, Globe2 } from 'lucide-react';
import { loadConversionSnapshot } from '@/modules/conversion/services/conversionQueries';

const PAGE_KEY = 'admin.conversion-optimization';

const AdminConversionOptimization: React.FC = () => {
  const { isRTL } = useLanguage();
  useNoIndex();
  const t = (ar: string, en: string) => (isRTL ? ar : en);

  const snapQ = useQuery({
    queryKey: ['admin', 'conversion-optimization', 'snapshot'],
    queryFn: () => loadConversionSnapshot(),
    staleTime: 60_000,
  });
  const snap = snapQ.data;

  return (
    <div className="min-h-screen bg-background flex flex-col" dir={isRTL ? 'rtl' : 'ltr'}>
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-7xl">
        <header className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold">
              {t('تحسين معدلات التحويل', 'Marketplace Conversion Optimization')}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t(
                'لوحة قراءة فقط: زوار، طلبات عروض، تسجيلات مزودين، وتحقّق. لا تتبّع جديد.',
                'Read-only dashboard: visitors, RFQs, provider registrations and verifications. No new tracking.',
              )}
            </p>
          </div>
          <HelpLauncher pageKey={PAGE_KEY} />
        </header>

        {snapQ.isLoading || !snap ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6">
            <section
              data-testid="conversion-kpi-grid"
              className="grid grid-cols-2 md:grid-cols-4 gap-3"
            >
              <Kpi icon={<Users className="h-4 w-4" />} label={t('زوار', 'Visitors')} value={snap.kpis.visitors} />
              <Kpi icon={<FileText className="h-4 w-4" />} label={t('بدء طلب عرض', 'RFQ Started')} value={snap.kpis.rfq_started} />
              <Kpi icon={<TrendingUp className="h-4 w-4" />} label={t('تقديم طلب عرض', 'RFQ Submitted')} value={snap.kpis.rfq_submitted} />
              <Kpi icon={<Users className="h-4 w-4" />} label={t('تسجيلات مزودين', 'Provider Registrations')} value={snap.kpis.provider_registrations} />
              <Kpi icon={<Globe2 className="h-4 w-4" />} label={t('مزودون منشورون', 'Published Providers')} value={snap.kpis.published_providers} />
              <Kpi icon={<ShieldCheck className="h-4 w-4" />} label={t('طلبات توثيق', 'Verification Requests')} value={snap.kpis.verification_requests} />
              <Kpi label={t('متوسط اكتمال الملف', 'Avg Profile Completion')} value={`${snap.kpis.avg_profile_completion}%`} />
              <Kpi label={t('نسبة النشر', 'Publication Rate')} value={`${snap.kpis.publication_rate}%`} />
            </section>

            <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card className="p-4" data-testid="completion-distribution">
                <h2 className="font-semibold mb-3">
                  {t('توزيع اكتمال الملف للمزودين', 'Profile Completion Distribution')}
                </h2>
                <ul className="space-y-2 text-sm">
                  {snap.completionBuckets.map((b) => (
                    <li key={b.bucket} className="flex items-center gap-3">
                      <span className="w-20 text-muted-foreground">{b.bucket}</span>
                      <div className="flex-1 h-2 rounded bg-muted overflow-hidden">
                        <div
                          className="h-full bg-primary"
                          style={{ width: `${Math.min(100, b.percent)}%` }}
                        />
                      </div>
                      <span className="w-12 text-end tabular-nums">{b.count}</span>
                    </li>
                  ))}
                </ul>
              </Card>

              <Card className="p-4" data-testid="top-conversion-pages">
                <h2 className="font-semibold mb-3">{t('أعلى الصفحات تحويلًا', 'Top Conversion Pages')}</h2>
                <ul className="space-y-1 text-sm">
                  {snap.topConversionPages.map((p) => (
                    <li key={p.path} className="flex items-center justify-between gap-3">
                      <span className="truncate text-muted-foreground">{p.path}</span>
                      <Badge variant="secondary">{p.conversions}</Badge>
                    </li>
                  ))}
                  {!snap.topConversionPages.length && (
                    <li className="text-muted-foreground">{t('لا توجد بيانات', 'No data')}</li>
                  )}
                </ul>
              </Card>

              <Card className="p-4" data-testid="top-dropoff-pages">
                <h2 className="font-semibold mb-3">{t('أعلى صفحات التسرّب', 'Top Drop-off Pages')}</h2>
                <ul className="space-y-1 text-sm">
                  {snap.topDropoffPages.map((p) => (
                    <li key={p.path} className="flex items-center justify-between gap-3">
                      <span className="truncate text-muted-foreground">{p.path}</span>
                      <Badge variant="destructive">{p.dropoffs}</Badge>
                    </li>
                  ))}
                  {!snap.topDropoffPages.length && (
                    <li className="text-muted-foreground">{t('لا توجد بيانات', 'No data')}</li>
                  )}
                </ul>
              </Card>

              <Card className="p-4" data-testid="quick-routes">
                <h2 className="font-semibold mb-3">{t('روابط سريعة', 'Quick Routes')}</h2>
                <ul className="space-y-2 text-sm">
                  <li><Link className="text-primary hover:underline" to="/admin/provider-growth">{t('محرّك نمو المزودين', 'Provider Growth Engine')}</Link></li>
                  <li><Link className="text-primary hover:underline" to="/admin/catalog-governance">{t('حوكمة الكتالوج', 'Catalog Governance')}</Link></li>
                  <li><Link className="text-primary hover:underline" to="/admin/operations-center">{t('مركز العمليات الموحّد', 'Unified Operations Center')}</Link></li>
                  <li><Link className="text-primary hover:underline" to="/admin/reports">{t('التقارير', 'Reports')}</Link></li>
                </ul>
              </Card>
            </section>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

const Kpi: React.FC<{ icon?: React.ReactNode; label: string; value: number | string }> = ({
  icon,
  label,
  value,
}) => (
  <Card className="p-3">
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      {icon}
      <span className="truncate">{label}</span>
    </div>
    <div className="mt-1 text-2xl font-bold tabular-nums">{value}</div>
  </Card>
);

export default AdminConversionOptimization;