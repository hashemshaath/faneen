/**
 * ADMIN REDESIGN PHASE 9G — BrandClaimsPanel.
 * Read-only presentation of related brand requests (claims / link / update
 * proposals). Routes to the dedicated brand-requests queue for action.
 * No Supabase, no queries, no mutations.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { pickBi } from '@/components/common/Bilingual';
import {
  pick, requestTypeLabel, requestStatusLabel,
  type BrandRequest,
} from '@/modules/brands';

export interface BrandClaimsPanelProps {
  isRTL: boolean;
  locale: 'ar' | 'en';
  requests: BrandRequest[] | undefined;
  loading: boolean;
}

export const BrandClaimsPanel: React.FC<BrandClaimsPanelProps> = ({
  isRTL, locale, requests, loading,
}) => {
  const rows = requests ?? [];
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">
          {pickBi(isRTL, 'الطلبات المرتبطة', 'Related requests')}{' '}
          <span className="text-xs text-muted-foreground">({rows.length})</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? <Skeleton className="h-20" /> : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{pickBi(isRTL, 'لا توجد طلبات مرتبطة', 'No related requests')}</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {rows.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-2 flex-wrap border rounded-lg p-2">
                <div className="flex items-center gap-2 flex-wrap min-w-0">
                  {r.ref_id && <code className="tech-content text-xs">{r.ref_id}</code>}
                  <Badge variant="outline" className="text-xs">{pick(requestTypeLabel[r.request_type], locale)}</Badge>
                  <Badge variant="secondary" className="text-xs">{pick(requestStatusLabel[r.status], locale)}</Badge>
                  <span className="truncate" dir="auto">{locale === 'ar' ? r.name_ar : (r.name_en ?? r.name_ar)}</span>
                </div>
                <Button size="sm" variant="ghost" asChild>
                  <Link to="/admin/brand-requests">{pickBi(isRTL, 'فتح القائمة', 'Open queue')}</Link>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};

export default BrandClaimsPanel;