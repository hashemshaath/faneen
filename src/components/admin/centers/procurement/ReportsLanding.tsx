import { Link } from 'react-router-dom';
import { BarChart3, Wrench, FileText, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/i18n/LanguageContext';

/**
 * Reports tab — presentational. CSV export and reporting widgets live
 * inside Operations / Quote Requests; this tile clarifies entry points
 * without owning any CSV building logic.
 */

const TILES = [
  {
    key: 'ops-reports',
    to: '/admin/quote-operations',
    icon: Wrench,
    title: { ar: 'تقارير العمليات', en: 'Operations Reports' },
    description: {
      ar: 'لوحة العمليات تحتوي على تصدير CSV ومؤشرات الأداء.',
      en: 'The operations board hosts CSV exports and performance KPIs.',
    },
  },
  {
    key: 'requests-export',
    to: '/admin/quote-requests',
    icon: FileText,
    title: { ar: 'تصدير الطلبات', en: 'Requests Export' },
    description: {
      ar: 'تصدير قائمة الطلبات من شاشة الطلبات نفسها.',
      en: 'Export the requests list from the requests screen.',
    },
  },
] as const;

const ReportsLanding = () => {
  const { isRTL } = useLanguage();
  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-border/60 bg-muted/20 p-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2 text-foreground font-medium">
          <BarChart3 className="size-4 text-primary" />
          {isRTL ? 'التقارير من مكانها الأصلي' : 'Reports live where the data does'}
        </div>
        <p className="mt-1">
          {isRTL
            ? 'لا يتم نقل بناء أو تنزيل CSV هنا؛ الروابط تأخذك إلى مصدر التقرير الأصلي.'
            : 'CSV building and downloads are not moved here — these links jump to the original report source.'}
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {TILES.map((tile) => {
          const Icon = tile.icon;
          return (
            <Link
              key={tile.key}
              to={tile.to}
              className="group block focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl"
            >
              <Card className="h-full transition-colors group-hover:border-primary/40">
                <CardHeader className="flex flex-row items-start gap-3 space-y-0">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="size-5" />
                  </div>
                  <CardTitle className="flex flex-1 items-center justify-between gap-2 text-base">
                    <span className="truncate">{isRTL ? tile.title.ar : tile.title.en}</span>
                    <ArrowRight
                      className={`size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 ${isRTL ? 'rotate-180' : ''}`}
                    />
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 text-sm text-muted-foreground">
                  {isRTL ? tile.description.ar : tile.description.en}
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default ReportsLanding;