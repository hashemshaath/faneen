/**
 * BUSINESS-FINISHING-1 Phase F — Read-only quotation revision UI.
 * Consumes pure derivation helper from @/modules/quotes/lib/revisionHistory.
 */
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { History } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import { listBusinessActivityTimeline } from '@/modules/businesses/notes/services/listBusinessActivityTimeline';
import { deriveQuotationRevisions } from '@/modules/quotes/lib/revisionHistory';

export interface QuotationRevisionHistoryProps {
  businessId: string;
  quotationRefId: string;
  className?: string;
}

export const QuotationRevisionHistory: React.FC<QuotationRevisionHistoryProps> = ({
  businessId, quotationRefId, className,
}) => {
  const { isRTL } = useLanguage();
  const { data, isLoading } = useQuery({
    queryKey: ['quotation-revisions', businessId, quotationRefId],
    queryFn: async () => {
      const { data, error } = await listBusinessActivityTimeline({
        businessId, limit: 200,
      });
      if (error) throw error;
      return deriveQuotationRevisions(data ?? [], quotationRefId);
    },
    enabled: !!businessId && !!quotationRefId,
    staleTime: 30_000,
  });

  return (
    <Card className={className} data-testid="quotation-revision-history">
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <History className="w-4 h-4" />
          {isRTL ? 'سجل الإصدارات' : 'Revision history'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading && <Skeleton className="h-16 w-full" />}
        {!isLoading && (data?.length ?? 0) === 0 && (
          <p className="text-xs text-muted-foreground">
            {isRTL ? 'لا توجد إصدارات بعد' : 'No revisions yet'}
          </p>
        )}
        <ol className="space-y-1.5">
          {(data ?? []).map((r) => (
            <li
              key={`v${r.version}-${r.createdAt}`}
              className="flex items-center gap-2 text-xs border-b border-border/20 pb-1.5"
              data-testid="revision-entry"
            >
              <span className="font-mono tech-content w-10">v{r.version}</span>
              <span className="flex-1 truncate">{r.action}</span>
              <span className="text-[10px] text-muted-foreground tech-content">
                {new Date(r.createdAt).toLocaleString(isRTL ? 'ar-SA-u-nu-latn' : 'en-US', {
                  dateStyle: 'medium', timeStyle: 'short',
                })}
              </span>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
};

export default QuotationRevisionHistory;