import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, X } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export interface OperationsSelectOption {
  value: string;
  label: string;
}

export interface OperationsFiltersBarProps {
  searchValue?: string;
  onSearchChange?: (v: string) => void;
  searchPlaceholder?: string;

  statusOptions?: OperationsSelectOption[];
  statusValue?: string;
  onStatusChange?: (v: string) => void;
  statusPlaceholder?: string;

  typeOptions?: OperationsSelectOption[];
  typeValue?: string;
  onTypeChange?: (v: string) => void;
  typePlaceholder?: string;

  fromDate?: string;
  toDate?: string;
  onFromDateChange?: (v: string) => void;
  onToDateChange?: (v: string) => void;
  fromLabel?: string;
  toLabel?: string;

  canReset?: boolean;
  onReset?: () => void;
  resetLabel?: string;

  rightSlot?: React.ReactNode;
}

/**
 * OperationsFiltersBar — presentational filters for ops/notifications/SLA.
 * Values + callbacks only; no query logic, no Supabase.
 */
export const OperationsFiltersBar: React.FC<OperationsFiltersBarProps> = ({
  searchValue, onSearchChange, searchPlaceholder,
  statusOptions, statusValue, onStatusChange, statusPlaceholder,
  typeOptions, typeValue, onTypeChange, typePlaceholder,
  fromDate, toDate, onFromDateChange, onToDateChange, fromLabel, toLabel,
  canReset, onReset, resetLabel, rightSlot,
}) => {
  const showSearch = typeof onSearchChange === 'function';
  const showStatus = !!statusOptions && statusOptions.length > 0 && typeof onStatusChange === 'function';
  const showType = !!typeOptions && typeOptions.length > 0 && typeof onTypeChange === 'function';
  const showFrom = typeof onFromDateChange === 'function';
  const showTo = typeof onToDateChange === 'function';

  return (
    <Card className="rounded-3xl border-border/60 bg-card/80 backdrop-blur-sm">
      <CardContent className="p-3 md:p-4">
        <div className="flex flex-wrap items-center gap-2">
          {showSearch && (
            <div className="relative flex-1 min-w-[12rem]">
              <Search className="absolute top-1/2 -translate-y-1/2 start-3 h-4 w-4 text-muted-foreground" aria-hidden />
              <Input
                className="ps-10 h-11 rounded-xl bg-background/60"
                placeholder={searchPlaceholder}
                value={searchValue ?? ''}
                onChange={(e) => onSearchChange?.(e.target.value)}
              />
            </div>
          )}
          {showStatus && (
            <Select value={statusValue} onValueChange={onStatusChange}>
              <SelectTrigger className="h-11 w-44 rounded-xl bg-background/60">
                <SelectValue placeholder={statusPlaceholder} />
              </SelectTrigger>
              <SelectContent>
                {statusOptions!.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {showType && (
            <Select value={typeValue} onValueChange={onTypeChange}>
              <SelectTrigger className="h-11 w-48 rounded-xl bg-background/60">
                <SelectValue placeholder={typePlaceholder} />
              </SelectTrigger>
              <SelectContent>
                {typeOptions!.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {(showFrom || showTo) && (
            <div className="flex items-center gap-2">
              {showFrom && (
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  {fromLabel}
                  <Input
                    type="date"
                    value={fromDate ?? ''}
                    onChange={(e) => onFromDateChange?.(e.target.value)}
                    className="h-11 w-40 rounded-xl bg-background/60 tech-content"
                  />
                </label>
              )}
              {showTo && (
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  {toLabel}
                  <Input
                    type="date"
                    value={toDate ?? ''}
                    onChange={(e) => onToDateChange?.(e.target.value)}
                    className="h-11 w-40 rounded-xl bg-background/60 tech-content"
                  />
                </label>
              )}
            </div>
          )}
          {canReset && onReset && (
            <Button variant="ghost" size="sm" onClick={onReset} className="gap-1">
              <X className="h-4 w-4" />
              {resetLabel}
            </Button>
          )}
          {rightSlot && <div className="ms-auto flex items-center gap-2">{rightSlot}</div>}
        </div>
      </CardContent>
    </Card>
  );
};

export default OperationsFiltersBar;