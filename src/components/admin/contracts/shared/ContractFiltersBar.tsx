/**
 * Presentational filters bar for admin contracts list.
 *
 * Pure UI — no Supabase, no queries, no mutations. Values and callbacks
 * are owned by the page. Labels use the canonical `getContractStatusMeta`
 * source of truth.
 */
import React from 'react';
import { Filter, Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { getContractStatusMeta } from '@/lib/contract-statuses';

export interface ContractFiltersBarProps {
  search: string;
  onSearchChange: (next: string) => void;
  searchPlaceholder?: string;
  status: string;
  statusOptions: readonly string[];
  onStatusChange: (next: string) => void;
  allLabel: string;
  isRTL?: boolean;
  onReset?: () => void;
  resetLabel?: string;
  className?: string;
}

export const ContractFiltersBar: React.FC<ContractFiltersBarProps> = ({
  search,
  onSearchChange,
  searchPlaceholder,
  status,
  statusOptions,
  onStatusChange,
  allLabel,
  isRTL = true,
  onReset,
  resetLabel,
  className,
}) => {
  const showReset = Boolean(onReset) && (search.trim().length > 0 || status !== 'all');
  return (
    <div className={cn('flex flex-wrap items-center gap-3', className)}>
      <div className="relative flex-1 min-w-[200px]">
        <Search className="w-4 h-4 absolute top-1/2 -translate-y-1/2 start-3 text-muted-foreground" />
        <Input
          dir="auto"
          className="ps-9 h-10 rounded-xl"
          placeholder={searchPlaceholder}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-muted-foreground" />
        <Select value={status} onValueChange={onStatusChange}>
          <SelectTrigger className="w-[180px] h-10 rounded-xl">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((s) => (
              <SelectItem key={s} value={s}>
                {s === 'all'
                  ? allLabel
                  : (getContractStatusMeta(s)[isRTL ? 'label_ar' : 'label_en'] ?? s)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {showReset ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-10 gap-1 rounded-xl"
          onClick={onReset}
        >
          <X className="w-3.5 h-3.5" />
          {resetLabel}
        </Button>
      ) : null}
    </div>
  );
};

export default ContractFiltersBar;