import React from 'react';
import { Calendar, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getContractStatusMeta } from '@/lib/contract-statuses';
import type { ContractWithRole } from './ContractCard';

interface Props {
  c: ContractWithRole;
  isRTL: boolean;
  onOpen: (c: ContractWithRole) => void;
  onNavigate: (path: string) => void;
}

/**
 * Compact list row variant of a contract — single-line, dense, table-like.
 * Used when the user toggles to compact view.
 */
export const ContractCompactRow = React.memo(({ c, isRTL, onOpen, onNavigate }: Props) => {
  const meta = getContractStatusMeta(c.status);
  const StatusIcon = meta.icon;
  const NextIcon = isRTL ? ChevronLeft : ChevronRight;
  const title = isRTL ? c.title_ar : (c.title_en || c.title_ar);
  const date = new Date(c.created_at).toLocaleDateString(isRTL ? 'ar-SA-u-nu-latn' : 'en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  });

  return (
    <button
      type="button"
      onClick={() => onOpen(c)}
      className={`group w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border ${meta.border} bg-card hover:border-accent/40 hover:shadow-sm transition-all text-start`}
    >
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${meta.gradient}`}>
        <StatusIcon className="w-4 h-4" aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-semibold text-xs sm:text-sm truncate group-hover:text-accent transition-colors">
            {title}
          </span>
          <span className="text-[10px] text-muted-foreground tech-content shrink-0" dir="ltr">
            {c.contract_number}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <Badge className={`${meta.badge} text-[9px] px-1.5 py-0 h-4`}>
            {isRTL ? meta.label_ar : meta.label_en}
          </Badge>
          <span className="text-[10px] text-muted-foreground inline-flex items-center gap-1">
            <Calendar className="w-2.5 h-2.5" aria-hidden="true" />{date}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-xs sm:text-sm font-bold tech-content">
          {Number(c.total_amount).toLocaleString()}
          <span className="text-[9px] text-muted-foreground ms-1 font-normal">{c.currency_code}</span>
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 opacity-60 group-hover:opacity-100"
          onClick={(e) => { e.stopPropagation(); onNavigate(`/contracts/${c.id}`); }}
          aria-label={isRTL ? 'فتح في صفحة كاملة' : 'Open full page'}
        >
          <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
        </Button>
        <NextIcon className="w-4 h-4 text-muted-foreground/40 group-hover:text-accent transition-colors" aria-hidden="true" />
      </div>
    </button>
  );
});
ContractCompactRow.displayName = 'ContractCompactRow';