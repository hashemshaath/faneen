import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Inbox, ShieldCheck, AlertTriangle, ArrowRight, ArrowLeft } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '@/i18n/LanguageContext';
import { getBrandOpsCounts } from '@/modules/brands';

/**
 * BRANDS-GOVERNANCE-2 Phase B — Compact ops-center widget surfacing
 * pending brand workload. Read-only counts; links open the dedicated
 * brand-requests queue (no review actions live here to avoid duplication).
 */
export function AdminBrandOpsCard() {
  const { isRTL } = useLanguage();
  const Arrow = isRTL ? ArrowLeft : ArrowRight;

  const { data, isLoading } = useQuery({
    queryKey: ['brand-ops-counts'],
    queryFn: getBrandOpsCounts,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  return (
    <Card className="border-border/40">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Inbox className="w-4 h-4 text-primary" />
          {isRTL ? 'العلامات التجارية' : 'Brands governance'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <Skeleton className="h-20 w-full" />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
            <Stat label={isRTL ? 'قيد الانتظار' : 'Pending'} value={data?.pendingBrandRequests ?? 0} tone="warn" />
            <Stat label={isRTL ? 'قيد المراجعة' : 'In review'} value={data?.inReviewBrandRequests ?? 0} tone="accent" />
            <Stat label={isRTL ? 'يحتاج معلومات' : 'Needs info'} value={data?.needsInfoBrandRequests ?? 0} tone="warn" />
            <Stat label={isRTL ? 'ربط مزوّد' : 'Provider links'} value={data?.pendingProviderBrandLinks ?? 0} tone="accent" />
          </div>
        )}
        {!!data?.pendingDuplicateReports && (
          <div className="text-xs flex items-center gap-1 text-amber-700 dark:text-amber-400">
            <AlertTriangle className="w-3 h-3" />
            {isRTL ? `${data.pendingDuplicateReports} بلاغ تكرار بانتظار المراجعة` : `${data.pendingDuplicateReports} duplicate reports awaiting review`}
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="outline">
            <Link to="/admin/brand-requests">
              {isRTL ? 'طلبات العلامات' : 'Brand requests'}
              <Arrow className="w-3.5 h-3.5 ms-1" />
            </Link>
          </Button>
          <Button asChild size="sm" variant="ghost">
            <Link to="/admin/brands">
              <ShieldCheck className="w-3.5 h-3.5 me-1" />
              {isRTL ? 'سجل العلامات' : 'Brands registry'}
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: 'warn' | 'accent' }) {
  const cls = tone === 'warn' ? 'text-amber-600 dark:text-amber-400' : 'text-accent';
  return (
    <div className="rounded-lg border bg-card p-2">
      <div className={`text-xl font-semibold tabular-nums ${cls}`}>{value}</div>
      <div className="text-[10px] text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}

export default AdminBrandOpsCard;