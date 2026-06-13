/**
 * Shared presentational filters bar for admin memberships / finance pages.
 * Controlled — values & callbacks come from the page.
 * Pure UI — no API, no Supabase, no queries, no mutations.
 */
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface MembershipFilterOption {
  value: string;
  label: string;
}

export interface MembershipFiltersBarProps {
  // Search
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  onSearchEnter?: () => void;
  searchPlaceholder?: string;
  searchDir?: 'auto' | 'ltr' | 'rtl';

  // Status
  statusValue?: string;
  onStatusChange?: (value: string) => void;
  statusOptions?: ReadonlyArray<MembershipFilterOption>;
  statusAllLabel?: string;
  statusPlaceholder?: string;

  // Tier
  tierValue?: string;
  onTierChange?: (value: string) => void;
  tierOptions?: ReadonlyArray<MembershipFilterOption>;
  tierAllLabel?: string;

  // Reason
  reasonValue?: string;
  onReasonChange?: (value: string) => void;
  reasonOptions?: ReadonlyArray<MembershipFilterOption>;
  reasonAllLabel?: string;

  // Date range
  dateFrom?: string;
  onDateFromChange?: (value: string) => void;
  dateTo?: string;
  onDateToChange?: (value: string) => void;
  dateFromLabel?: string;
  dateToLabel?: string;

  // Buttons
  onApply?: () => void;
  applyLabel?: string;
  onReset?: () => void;
  resetLabel?: string;

  /** Slot for page-specific extras (custom inputs, ref_id, business_id …). */
  extras?: React.ReactNode;
  /** Slot rendered next to Apply / Reset buttons (e.g. total counter). */
  actionsExtras?: React.ReactNode;

  className?: string;
  gridClassName?: string;
}

export const MembershipFiltersBar: React.FC<MembershipFiltersBarProps> = ({
  searchValue,
  onSearchChange,
  onSearchEnter,
  searchPlaceholder,
  searchDir = 'auto',

  statusValue,
  onStatusChange,
  statusOptions,
  statusAllLabel,

  tierValue,
  onTierChange,
  tierOptions,
  tierAllLabel,

  reasonValue,
  onReasonChange,
  reasonOptions,
  reasonAllLabel,

  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
  dateFromLabel,
  dateToLabel,

  onApply,
  applyLabel,
  onReset,
  resetLabel,

  extras,
  actionsExtras,
  className,
  gridClassName,
}) => {
  const hasSearch = typeof onSearchChange === 'function';
  const hasStatus = !!statusOptions && typeof onStatusChange === 'function';
  const hasTier = !!tierOptions && typeof onTierChange === 'function';
  const hasReason = !!reasonOptions && typeof onReasonChange === 'function';
  const hasDate =
    typeof onDateFromChange === 'function' || typeof onDateToChange === 'function';
  const hasButtons = typeof onApply === 'function' || typeof onReset === 'function';

  return (
    <Card className={className}>
      <CardContent
        className={cn(
          'grid gap-3 p-4 md:grid-cols-2 lg:grid-cols-3',
          gridClassName,
        )}
      >
        {hasSearch && (
          <div className="relative">
            <Search className="absolute top-1/2 -translate-y-1/2 start-3 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchValue ?? ''}
              onChange={(e) => onSearchChange?.(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onSearchEnter?.();
              }}
              placeholder={searchPlaceholder}
              className="ps-9 tech-content"
              dir={searchDir}
            />
          </div>
        )}

        {hasStatus && (
          <Select value={statusValue} onValueChange={onStatusChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statusAllLabel && (
                <SelectItem value="all">{statusAllLabel}</SelectItem>
              )}
              {statusOptions!.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {hasTier && (
          <Select value={tierValue} onValueChange={onTierChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {tierAllLabel && (
                <SelectItem value="all">{tierAllLabel}</SelectItem>
              )}
              {tierOptions!.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {hasReason && (
          <Select value={reasonValue} onValueChange={onReasonChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {reasonAllLabel && (
                <SelectItem value="all">{reasonAllLabel}</SelectItem>
              )}
              {reasonOptions!.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {extras}

        {hasDate && (
          <>
            <div className="flex items-center gap-2">
              <label className="w-12 text-xs text-muted-foreground">
                {dateFromLabel}
              </label>
              <Input
                type="date"
                value={dateFrom ?? ''}
                onChange={(e) => onDateFromChange?.(e.target.value)}
                className="tech-content"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="w-12 text-xs text-muted-foreground">
                {dateToLabel}
              </label>
              <Input
                type="date"
                value={dateTo ?? ''}
                onChange={(e) => onDateToChange?.(e.target.value)}
                className="tech-content"
              />
            </div>
          </>
        )}

        {(hasButtons || actionsExtras) && (
          <div className="flex items-center gap-2 md:col-span-2 lg:col-span-3">
            {onApply && (
              <Button onClick={onApply} className="gap-2">
                {applyLabel}
              </Button>
            )}
            {onReset && (
              <Button variant="outline" onClick={onReset} className="gap-2">
                <X className="h-4 w-4" />
                {resetLabel}
              </Button>
            )}
            {actionsExtras && <div className="ms-auto">{actionsExtras}</div>}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MembershipFiltersBar;