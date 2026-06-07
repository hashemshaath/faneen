import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import type { TaxonomyFallbackReport } from '../usage-services';

interface Props {
  report: TaxonomyFallbackReport | undefined;
  loading?: boolean;
}

/** Admin-only report of legacy fallback usage — guides when sectors/sub_services can be removed. */
export const TaxonomyFallbackReportCard: React.FC<Props> = ({ report, loading }) => {
  const { isRTL } = useLanguage();
  if (loading || !report) {
    return <Skeleton className="h-32 rounded-xl" />;
  }

  const items = [
    {
      label: isRTL ? 'منشآت بلا تصنيف مركزي' : 'Businesses without taxonomy',
      value: report.businessesWithoutTaxonomy,
      total: report.businessesTotal,
    },
    {
      label: isRTL ? 'أعمال Showcase بلا تصنيف' : 'Showcase items without taxonomy',
      value: report.showcaseWithoutTaxonomy,
      total: report.showcaseTotal,
    },
  ];

  const allClean = items.every((i) => i.value === 0);

  return (
    <Card className="p-4 rounded-xl">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="font-heading font-bold text-sm">
          {isRTL ? 'استخدام البيانات القديمة (Fallback)' : 'Legacy fallback usage'}
        </div>
        {allClean ? (
          <Badge variant="outline" className="gap-1 text-emerald-600 border-emerald-500/40">
            <CheckCircle2 className="w-3 h-3" />
            {isRTL ? 'كل البيانات مهاجَرة' : 'Fully migrated'}
          </Badge>
        ) : (
          <Badge variant="outline" className="gap-1 text-amber-600 border-amber-500/40">
            <AlertTriangle className="w-3 h-3" />
            {isRTL ? 'لا تحذف الحقول القديمة بعد' : 'Do not drop legacy fields yet'}
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {items.map((i) => {
          const pct = i.total > 0 ? Math.round((i.value / i.total) * 100) : 0;
          return (
            <div key={i.label} className="rounded-lg border border-border bg-background px-3 py-2">
              <div className="text-[11px] text-muted-foreground">{i.label}</div>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="tech-content font-bold text-lg">{i.value}</span>
                <span className="text-[11px] text-muted-foreground tech-content">/ {i.total}</span>
                <span className="text-[11px] text-muted-foreground ms-auto tech-content">{pct}%</span>
              </div>
            </div>
          );
        })}
      </div>

      {report.partial && (
        <p className="mt-3 text-[11px] text-muted-foreground">
          {isRTL
            ? 'بعض الأرقام جزئية لأن RLS منع قراءة بعض الجداول.'
            : 'Some numbers are partial because RLS blocked some reads.'}
        </p>
      )}
    </Card>
  );
};

export default TaxonomyFallbackReportCard;