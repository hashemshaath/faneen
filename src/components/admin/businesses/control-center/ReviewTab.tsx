import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldCheck } from 'lucide-react';
import { pickBi } from '@/components/common/Bilingual';
import {
  reviewBuckets,
  pilotReadinessReasons,
  type BusinessMetricsRow,
} from '@/modules/admin/businesses/businessAdminMetrics';
import { BusinessMiniCard } from './BusinessMiniCard';

interface ReviewTabProps {
  businesses: ReadonlyArray<BusinessMetricsRow & {
    name_ar?: string | null; name_en?: string | null;
    ref_id?: string | null; logo_url?: string | null;
  }>;
  isRTL: boolean;
  onJumpToBusiness?: (b: BusinessMetricsRow) => void;
}

export const ReviewTab: React.FC<ReviewTabProps> = ({ businesses, isRTL, onJumpToBusiness }) => {
  const buckets = reviewBuckets(businesses, isRTL);

  return (
    <div className="space-y-4" data-testid="business-control-center-review">
      {buckets.map((b) => (
        <Card key={b.key} className="rounded-3xl border-border/60 bg-card/70">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-heading flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-muted-foreground" />
              {b.label}
              <span className="ms-1 text-xs text-muted-foreground tabular-nums">
                ({b.rows.length})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {b.rows.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">
                {pickBi(isRTL, 'لا توجد عناصر في هذه القائمة.', 'No items in this bucket.')}
              </p>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
                {b.rows.slice(0, 20).map((row) => (
                  <BusinessMiniCard
                    key={row.id}
                    business={row}
                    isRTL={isRTL}
                    reasons={pilotReadinessReasons(row, isRTL).slice(0, 3)}
                    reasonTone="warning"
                    onJumpToBusiness={onJumpToBusiness}
                  />
                ))}
                {b.rows.length > 20 ? (
                  <p className="col-span-full text-[11px] text-muted-foreground text-center">
                    {pickBi(
                      isRTL,
                      `يتم عرض أول 20 من إجمالي ${b.rows.length}.`,
                      `Showing first 20 of ${b.rows.length}.`,
                    )}
                  </p>
                ) : null}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default ReviewTab;