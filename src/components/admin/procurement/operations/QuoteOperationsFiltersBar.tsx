/**
 * Presentational filters/actions row for the admin quote operations
 * dashboard. Rendered inside `AdminPageHeader.actions`.
 *
 * Pure UI — owns no queries, mutations, aggregation, or CSV logic. The
 * parent passes current values + change handlers and a refresh/export
 * action pair. Sector options + city options are caller-provided so the
 * parent retains data ownership.
 */
import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

export type QuoteOperationsRange = 'today' | '7d' | '30d' | '90d' | 'all';

export interface QuoteOperationsSectorOption {
  value: string;
  label: string;
}

export interface QuoteOperationsFiltersBarProps {
  range: QuoteOperationsRange;
  onRangeChange: (value: QuoteOperationsRange) => void;

  sector: string;
  onSectorChange: (value: string) => void;
  sectorOptions: QuoteOperationsSectorOption[];

  city: string;
  onCityChange: (value: string) => void;
  cityOptions: string[];

  onRefresh: () => void;
  refreshDisabled?: boolean;
  refreshSpinning?: boolean;

  exportSlot?: React.ReactNode;
}

export const QuoteOperationsFiltersBar: React.FC<QuoteOperationsFiltersBarProps> = ({
  range,
  onRangeChange,
  sector,
  onSectorChange,
  sectorOptions,
  city,
  onCityChange,
  cityOptions,
  onRefresh,
  refreshDisabled,
  refreshSpinning,
  exportSlot,
}) => (
  <>
    <Select value={range} onValueChange={(v) => onRangeChange(v as QuoteOperationsRange)}>
      <SelectTrigger className="h-9 w-[140px] text-xs"><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value="today">اليوم</SelectItem>
        <SelectItem value="7d">آخر 7 أيام</SelectItem>
        <SelectItem value="30d">آخر 30 يوم</SelectItem>
        <SelectItem value="90d">آخر 90 يوم</SelectItem>
        <SelectItem value="all">كل الفترة</SelectItem>
      </SelectContent>
    </Select>
    <Select value={sector} onValueChange={onSectorChange}>
      <SelectTrigger className="h-9 w-[160px] text-xs"><SelectValue /></SelectTrigger>
      <SelectContent>
        {sectorOptions.map((s) => (
          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
    <Select value={city} onValueChange={onCityChange}>
      <SelectTrigger className="h-9 w-[140px] text-xs"><SelectValue placeholder="المدينة" /></SelectTrigger>
      <SelectContent>
        {cityOptions.map((c) => (
          <SelectItem key={c} value={c}>{c === 'all' ? 'كل المدن' : c}</SelectItem>
        ))}
      </SelectContent>
    </Select>
    <Button
      size="sm"
      variant="outline"
      className="h-9 text-xs"
      onClick={onRefresh}
      disabled={refreshDisabled}
      type="button"
    >
      <RefreshCw className={`h-3.5 w-3.5 ${refreshSpinning ? 'animate-spin' : ''}`} /> تحديث البيانات
    </Button>
    {exportSlot}
  </>
);

export default QuoteOperationsFiltersBar;