import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Bi } from '@/components/common/Bilingual';
import { Loader2, Link2, CalendarDays, AlertTriangle } from 'lucide-react';
import {
  getAssetCurrentRental,
  type AssetCurrentRentalInfo,
} from '../services/rentalAssignments';

/**
 * Inline panel shown on asset cards/details: current rental ref, period,
 * days remaining, overdue flag, link status. Hides customer private data.
 */
export const AssetRentalPanel: React.FC<{ assetId: string }> = ({ assetId }) => {
  const [info, setInfo] = useState<AssetCurrentRentalInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const data = await getAssetCurrentRental(assetId);
      setInfo(data);
      setLoading(false);
    })();
  }, [assetId]);

  if (loading) {
    return (
      <div className="flex justify-center py-3"><Loader2 className="size-4 animate-spin" /></div>
    );
  }
  if (!info || !info.current_rental_ref) {
    return (
      <div className="text-xs text-muted-foreground">
        <Bi ar="لا يوجد تأجير نشط مرتبط" en="No active rental linked" />
      </div>
    );
  }
  return (
    <Card className="p-3 space-y-2 border-dashed">
      <div className="flex items-center justify-between gap-2 text-sm">
        <div className="flex items-center gap-2">
          <Link2 className="size-4 text-primary" />
          <span className="tech-content font-medium">{info.current_rental_ref}</span>
        </div>
        {info.overdue && (
          <span className="inline-flex items-center gap-1 text-rose-700 dark:text-rose-300 text-xs">
            <AlertTriangle className="size-3.5" />
            <Bi ar="متأخر" en="Overdue" />
          </span>
        )}
      </div>
      <div className="text-xs text-muted-foreground flex items-center gap-2">
        <CalendarDays className="size-3.5" />
        <span className="tech-content">{info.start_date} → {info.end_date}</span>
        <span>·</span>
        <span>
          <Bi
            ar={`${info.days_remaining ?? 0} يوم متبقٍ`}
            en={`${info.days_remaining ?? 0} days left`}
          />
        </span>
      </div>
    </Card>
  );
};

export default AssetRentalPanel;
