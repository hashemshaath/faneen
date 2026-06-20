import React, { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Layers, Info } from 'lucide-react';
import { pickBi } from '@/components/common/Bilingual';
import { MetricBarList } from './MetricBarList';
import {
  entityTypeDistribution,
  type BusinessMetricsRow,
} from '@/modules/admin/businesses/businessAdminMetrics';

interface TaxonomiesTabProps {
  businesses: ReadonlyArray<BusinessMetricsRow>;
  isRTL: boolean;
}

/**
 * Taxonomies & sectors tab.
 *
 * The `businesses` row shape exposes `entity_type` reliably; there is
 * no dedicated sector column on this row, so we show the closest real
 * proxy (entity-type distribution) and call out the data-source gap
 * in plain language. No fake categories, no invented data.
 */
export const TaxonomiesTab: React.FC<TaxonomiesTabProps> = ({ businesses, isRTL }) => {
  const entityBuckets = useMemo(
    () => entityTypeDistribution(businesses, isRTL),
    [businesses, isRTL],
  );
  const total = businesses.length;

  return (
    <div className="space-y-4" data-testid="business-control-center-taxonomies">
      <Card className="rounded-3xl border-border/60 bg-card/60">
        <CardContent className="p-4 flex items-start gap-3 text-sm">
          <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
          <p className="text-muted-foreground">
            {pickBi(
              isRTL,
              'لا يتوفر مصدر تصنيف مفصّل (قطاع/خدمة) على مستوى صف الجهة في البيانات الحالية. نعرض هنا توزيع أنواع الجهات كأقرب مؤشر حقيقي بدون اختراع بيانات.',
              'No detailed sector/service taxonomy exists on the business row in the current data. We show entity-type distribution as the closest real signal, without inventing data.',
            )}
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <MetricBarList
          title={pickBi(isRTL, 'توزيع أنواع الجهات', 'Entity-type distribution')}
          icon={Layers}
          buckets={entityBuckets}
          total={total}
          isRTL={isRTL}
          tone="accent"
        />
      </div>
    </div>
  );
};

export default TaxonomiesTab;