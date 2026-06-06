import { X, FilterX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getContractStatusMeta } from '@/lib/contract-statuses';

interface Props {
  isRTL: boolean;
  resultCount: number;
  totalCount: number;
  statusFilter: string;
  roleFilter: 'all' | 'provider' | 'client';
  searchQuery: string;
  onClearStatus: () => void;
  onClearRole: () => void;
  onClearSearch: () => void;
  onClearAll: () => void;
}

/**
 * Active filter chips bar — shows current filters as removable chips,
 * a result count badge, and a "Clear all" affordance. Only renders when
 * any filter is active.
 */
export function ContractActiveFilters({
  isRTL, resultCount, totalCount,
  statusFilter, roleFilter, searchQuery,
  onClearStatus, onClearRole, onClearSearch, onClearAll,
}: Props) {
  const hasFilters = statusFilter !== 'all' || roleFilter !== 'all' || !!searchQuery.trim();
  if (!hasFilters) return null;

  const statusMeta = statusFilter !== 'all' ? getContractStatusMeta(statusFilter) : null;
  const roleLabel = roleFilter === 'provider'
    ? (isRTL ? 'صادرة' : 'Outgoing')
    : roleFilter === 'client'
      ? (isRTL ? 'واردة' : 'Incoming')
      : '';

  const Chip = ({ label, onRemove }: { label: string; onRemove: () => void }) => (
    <Badge
      variant="secondary"
      className="text-[10px] gap-1 h-6 px-2 rounded-full border border-border/60 bg-background/80"
    >
      <span className="truncate max-w-[140px]">{label}</span>
      <button
        type="button"
        onClick={onRemove}
        className="rounded-full hover:bg-muted -me-1 p-0.5 transition-colors"
        aria-label={isRTL ? `إزالة ${label}` : `Remove ${label}`}
      >
        <X className="w-2.5 h-2.5" aria-hidden="true" />
      </button>
    </Badge>
  );

  return (
    <div className="flex flex-wrap items-center gap-1.5 px-1 pt-1 border-t border-border/40">
      <span className="text-[10px] text-muted-foreground font-medium me-1">
        <strong className="text-foreground tech-content">{resultCount}</strong>
        {isRTL ? ` من ${totalCount} عقد` : ` of ${totalCount}`}
      </span>
      {statusMeta && (
        <Chip
          label={isRTL ? statusMeta.label_ar : statusMeta.label_en}
          onRemove={onClearStatus}
        />
      )}
      {roleFilter !== 'all' && (
        <Chip label={roleLabel} onRemove={onClearRole} />
      )}
      {searchQuery.trim() && (
        <Chip
          label={`"${searchQuery.trim()}"`}
          onRemove={onClearSearch}
        />
      )}
      <Button
        variant="ghost"
        size="sm"
        className="h-6 text-[10px] gap-1 px-2 ms-auto text-muted-foreground hover:text-destructive"
        onClick={onClearAll}
      >
        <FilterX className="w-3 h-3" aria-hidden="true" />
        {isRTL ? 'مسح الكل' : 'Clear all'}
      </Button>
    </div>
  );
}