/**
 * Presentational filters bar for admin procurement/RFQ pages.
 *
 * Pure UI — no Supabase, no queries, no mutations. The owning page
 * provides current values, change handlers, and option lists. Each
 * select is optional; only those passed in are rendered.
 */
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ProcurementFilterOption {
  value: string;
  label: React.ReactNode;
}

export interface ProcurementSelectFilter {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  allLabel?: React.ReactNode;
  options: ProcurementFilterOption[];
}

export interface ProcurementFiltersBarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;

  status?: ProcurementSelectFilter;
  sector?: ProcurementSelectFilter;
  type?: ProcurementSelectFilter;

  cityValue?: string;
  onCityChange?: (value: string) => void;
  cityPlaceholder?: string;

  onReset?: () => void;
  canReset?: boolean;
  resetLabel?: React.ReactNode;

  className?: string;
}

const SelectFilter: React.FC<{ filter: ProcurementSelectFilter }> = ({ filter }) => (
  <Select value={filter.value} onValueChange={filter.onChange}>
    <SelectTrigger>
      <SelectValue placeholder={filter.placeholder} />
    </SelectTrigger>
    <SelectContent>
      {filter.allLabel !== undefined ? (
        <SelectItem value="all">{filter.allLabel}</SelectItem>
      ) : null}
      {filter.options.map((opt) => (
        <SelectItem key={opt.value} value={opt.value}>
          {opt.label}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
);

export const ProcurementFiltersBar: React.FC<ProcurementFiltersBarProps> = ({
  searchValue,
  onSearchChange,
  searchPlaceholder,
  status,
  sector,
  type,
  cityValue,
  onCityChange,
  cityPlaceholder,
  onReset,
  canReset,
  resetLabel,
  className,
}) => {
  const hasCity = typeof cityValue === 'string' && !!onCityChange;
  const showReset = !!onReset;
  return (
    <Card className={className} data-testid="procurement-filters-bar">
      <CardContent
        className={cn(
          'p-4 grid grid-cols-1 md:grid-cols-5 gap-3',
        )}
      >
        <div className="relative md:col-span-2">
          <Search
            className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
            aria-hidden
          />
          <Input
            dir="auto"
            placeholder={searchPlaceholder}
            className="ps-9"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        {status ? <SelectFilter filter={status} /> : null}
        {sector ? <SelectFilter filter={sector} /> : null}
        {type ? <SelectFilter filter={type} /> : null}
        {hasCity ? (
          <Input
            dir="auto"
            placeholder={cityPlaceholder}
            value={cityValue}
            onChange={(e) => onCityChange?.(e.target.value)}
          />
        ) : null}
        {showReset ? (
          <div className="md:col-span-5 flex justify-end">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onReset}
              disabled={!canReset}
            >
              <X className="h-3.5 w-3.5" />
              {resetLabel}
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
};

export default ProcurementFiltersBar;