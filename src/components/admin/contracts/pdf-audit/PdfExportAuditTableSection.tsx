import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { PdfExportAuditRow } from './PdfExportAuditRow';
import type { PdfExportAuditRow as Row } from './types';

export interface PdfExportAuditTableSectionProps {
  rows: Row[];
  isLoading: boolean;
  isError: boolean;
  isFetching: boolean;
  isRTL: boolean;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  canPrev: boolean;
  canNext: boolean;
  onPrev: () => void;
  onNext: () => void;
}

export const PdfExportAuditTableSection: React.FC<PdfExportAuditTableSectionProps> = ({
  rows, isLoading, isError, isFetching, isRTL,
  page, pageSize, total, totalPages, canPrev, canNext, onPrev, onNext,
}) => {
  return (
    <Card>
      <CardContent className="p-3 md:p-4 space-y-2">
        {isLoading && (
          <p className="text-xs text-muted-foreground">{isRTL ? 'جارٍ التحميل...' : 'Loading...'}</p>
        )}
        {isError && (
          <p className="text-xs text-destructive">{isRTL ? 'تعذّر تحميل السجل.' : 'Failed to load history.'}</p>
        )}
        {!isLoading && !isError && rows.length === 0 && (
          <p className="text-xs text-muted-foreground">{isRTL ? 'لا توجد نتائج.' : 'No results.'}</p>
        )}

        <ol className="divide-y">
          {rows.map((r) => (
            <PdfExportAuditRow key={r.export_ref} row={r} isRTL={isRTL} />
          ))}
        </ol>

        {total > pageSize && (
          <div className="flex items-center justify-between pt-2">
            <span className="text-[11px] text-muted-foreground">
              {(() => {
                const from = page * pageSize + 1;
                const to = Math.min((page + 1) * pageSize, total);
                return isRTL ? `عرض ${from} إلى ${to} من ${total}` : `Showing ${from}–${to} of ${total}`;
              })()}
              <span className="mx-2 opacity-50">·</span>
              <span dir="ltr">{page + 1} / {totalPages}</span>
            </span>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" className="h-7 px-2"
                onClick={onPrev}
                disabled={!canPrev || isFetching}>
                {isRTL ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
                <span className="text-xs ms-1">{isRTL ? 'السابق' : 'Prev'}</span>
              </Button>
              <Button variant="outline" size="sm" className="h-7 px-2"
                onClick={onNext}
                disabled={!canNext || isFetching}>
                <span className="text-xs me-1">{isRTL ? 'التالي' : 'Next'}</span>
                {isRTL ? <ChevronLeft className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};