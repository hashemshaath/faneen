import React from 'react';
import { AdminFiltersBar, type AdminFilterPill } from '@/components/admin/AdminFiltersBar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

/**
 * ContentFiltersBar — presentational filters row for content/directory
 * admin pages. Wraps `AdminFiltersBar` and adds an optional sector
 * select. Values + callbacks only; no query logic, no Supabase.
 */
export interface ContentSectorOption {
  value: string;
  label: string;
}

export interface ContentFiltersBarProps {
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;

  pills?: AdminFilterPill[];
  activePill?: string;
  onPillSelect?: (key: string) => void;

  sectorOptions?: ContentSectorOption[];
  activeSector?: string;
  onSectorChange?: (value: string) => void;
  sectorPlaceholder?: string;
  sectorAllValue?: string;

  canReset?: boolean;
  onReset?: () => void;
  resetLabel?: string;

  rightSlot?: React.ReactNode;
}

export const ContentFiltersBar: React.FC<ContentFiltersBarProps> = ({
  searchValue,
  onSearchChange,
  searchPlaceholder,
  pills,
  activePill,
  onPillSelect,
  sectorOptions,
  activeSector,
  onSectorChange,
  sectorPlaceholder,
  sectorAllValue = 'all',
  canReset,
  onReset,
  resetLabel,
  rightSlot,
}) => {
  const hasSector = !!sectorOptions && sectorOptions.length > 0 && typeof onSectorChange === 'function';
  const right = (hasSector || rightSlot) ? (
    <>
      {hasSector && (
        <Select value={activeSector ?? sectorAllValue} onValueChange={onSectorChange}>
          <SelectTrigger className="h-11 w-44 rounded-xl bg-background/60">
            <SelectValue placeholder={sectorPlaceholder} />
          </SelectTrigger>
          <SelectContent>
            {sectorOptions!.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      {rightSlot}
    </>
  ) : undefined;

  return (
    <AdminFiltersBar
      searchValue={searchValue}
      onSearchChange={onSearchChange}
      searchPlaceholder={searchPlaceholder}
      pills={pills}
      activePill={activePill}
      onPillSelect={onPillSelect}
      canClear={canReset}
      onClear={onReset}
      clearLabel={resetLabel}
      rightSlot={right}
    />
  );
};

export default ContentFiltersBar;