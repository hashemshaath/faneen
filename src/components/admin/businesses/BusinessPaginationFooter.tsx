import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Activity, Shield } from 'lucide-react';

/**
 * BusinessPaginationFooter — page-info + paging controls + active/verified
 * count chips. Pure presentational, no Supabase, no mutations.
 */
interface BusinessPaginationFooterProps {
  isRTL: boolean;
  safePage: number;
  totalPages: number;
  pageSize: number;
  filteredLength: number;
  totalBusinesses: number;
  activeCount: number;
  verifiedCount: number;
  onPageChange: (n: number) => void;
}

export const BusinessPaginationFooter: React.FC<BusinessPaginationFooterProps> = ({
  isRTL, safePage, totalPages, pageSize, filteredLength, totalBusinesses,
  activeCount, verifiedCount, onPageChange,
}) => {
  const from = (safePage - 1) * pageSize + 1;
  const to = Math.min(safePage * pageSize, filteredLength);
  return (
    <div
      className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/30"
      data-testid="business-pagination-footer"
    >
      <p className="text-[11px] text-muted-foreground tech-content">
        {isRTL
          ? `الصفحة ${safePage}/${totalPages} · عرض ${from}–${to} من ${filteredLength} (إجمالي ${totalBusinesses})`
          : `Page ${safePage}/${totalPages} · ${from}–${to} of ${filteredLength} (total ${totalBusinesses})`}
      </p>
      <div className="flex items-center gap-2">
        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="outline"
              className="h-8 w-8 p-0 rounded-xl"
              disabled={safePage <= 1}
              onClick={() => onPageChange(safePage - 1)}
            >
              {isRTL ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </Button>
            <span className="text-[11px] text-muted-foreground tech-content min-w-[3rem] text-center">
              {safePage}/{totalPages}
            </span>
            <Button
              size="sm"
              variant="outline"
              className="h-8 w-8 p-0 rounded-xl"
              disabled={safePage >= totalPages}
              onClick={() => onPageChange(safePage + 1)}
            >
              {isRTL ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </Button>
          </div>
        )}
        <Badge variant="outline" className="text-[10px] h-5 gap-1">
          <Activity className="w-3 h-3" />
          {isRTL ? `${activeCount} نشط` : `${activeCount} active`}
        </Badge>
        <Badge variant="outline" className="text-[10px] h-5 gap-1">
          <Shield className="w-3 h-3" />
          {isRTL ? `${verifiedCount} موثق` : `${verifiedCount} verified`}
        </Badge>
      </div>
    </div>
  );
};

export default BusinessPaginationFooter;