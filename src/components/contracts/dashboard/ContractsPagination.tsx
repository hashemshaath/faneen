import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

interface Props {
  isRTL: boolean;
  page: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (s: number) => void;
}

/**
 * Pagination bar for the contracts list. Compact, RTL-aware,
 * exposes page-size selection and first/last/prev/next controls.
 */
export function ContractsPagination({
  isRTL, page, pageSize, totalItems, onPageChange, onPageSizeChange,
}: Props) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const current = Math.min(page, totalPages);
  const from = totalItems === 0 ? 0 : (current - 1) * pageSize + 1;
  const to = Math.min(current * pageSize, totalItems);
  const Prev = isRTL ? ChevronRight : ChevronLeft;
  const Next = isRTL ? ChevronLeft : ChevronRight;
  const First = isRTL ? ChevronsRight : ChevronsLeft;
  const Last = isRTL ? ChevronsLeft : ChevronsRight;

  if (totalItems <= pageSize && pageSize <= 10) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-xl border border-border/50 bg-card/60">
      <div className="text-[11px] text-muted-foreground tech-content">
        {isRTL ? `${from}-${to} من ${totalItems}` : `${from}-${to} of ${totalItems}`}
      </div>
      <div className="flex items-center gap-2">
        <Select value={String(pageSize)} onValueChange={(v) => onPageSizeChange(Number(v))}>
          <SelectTrigger className="h-8 w-[88px] text-[11px] rounded-lg" aria-label={isRTL ? 'حجم الصفحة' : 'Page size'}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[10, 20, 50, 100].map((n) => (
              <SelectItem key={n} value={String(n)} className="text-xs">{n} / {isRTL ? 'صفحة' : 'page'}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="inline-flex items-center gap-0.5 p-0.5 rounded-lg border border-border/50 bg-muted/30">
          <Button variant="ghost" size="icon" className="h-7 w-7" disabled={current <= 1} onClick={() => onPageChange(1)} aria-label={isRTL ? 'الأولى' : 'First'}>
            <First className="w-3.5 h-3.5" aria-hidden="true" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" disabled={current <= 1} onClick={() => onPageChange(current - 1)} aria-label={isRTL ? 'السابق' : 'Previous'}>
            <Prev className="w-3.5 h-3.5" aria-hidden="true" />
          </Button>
          <span className="px-2 text-[11px] tech-content min-w-[64px] text-center">
            {current} / {totalPages}
          </span>
          <Button variant="ghost" size="icon" className="h-7 w-7" disabled={current >= totalPages} onClick={() => onPageChange(current + 1)} aria-label={isRTL ? 'التالي' : 'Next'}>
            <Next className="w-3.5 h-3.5" aria-hidden="true" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" disabled={current >= totalPages} onClick={() => onPageChange(totalPages)} aria-label={isRTL ? 'الأخيرة' : 'Last'}>
            <Last className="w-3.5 h-3.5" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </div>
  );
}